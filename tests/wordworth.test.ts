import { describe, expect, test } from "bun:test";
import { parseArgs } from "../src/cli/args.ts";
import { lookupOxford } from "../src/data/oxford.ts";
import { evaluateWord } from "../src/domain/pipeline.ts";
import type { LearnerState } from "../src/domain/types.ts";

describe("argument parsing", () => {
  test("accepts interactive and JSON forms", () => {
    expect(parseArgs(["underpin"])).toEqual({
      word: "underpin",
      context: null,
      json: false,
      help: false,
    });
    expect(parseArgs(["underpin", "--context", "This idea underpins the plan.", "--json"])).toEqual({
      word: "underpin",
      context: "This idea underpins the plan.",
      json: true,
      help: false,
    });
  });
});

describe("Oxford lookup", () => {
  test("is case-insensitive and returns a CEFR level", () => {
    const lookup = new Map([["underpin", "C1"]]);
    expect(lookupOxford(lookup, " Underpin ")).toEqual({ found: true, cefr: "C1" });
  });

  test("returns a miss without throwing", () => {
    expect(lookupOxford(new Map(), "unknown")).toEqual({ found: false, cefr: null });
  });
});

function providers(score: number) {
  let generated = false;
  let receivedState: LearnerState | null = null;
  return {
    state: () => receivedState,
    wasGenerated: () => generated,
    jev: {
      evaluate: async (state: LearnerState) => {
        receivedState = state;
        return score;
      },
    },
    openai: {
      generate: async () => {
        generated = true;
        return {
          definition: "to support an idea",
          usage: "Often followed by a noun.",
          example: "Evidence underpins the recommendation.",
        };
      },
    },
  };
}

describe("evaluation pipeline", () => {
  test("calls OpenAI at the inclusive score threshold", async () => {
    const deps = providers(1);
    const result = await evaluateWord("rareword", "This rareword appears in the plan.", {
      ...deps,
      loadLookup: async () => new Map(),
    });

    expect(deps.wasGenerated()).toBe(true);
    expect(result.learningPriority?.score).toBe(1);
    expect(result.learningMaterial).not.toBeNull();
    expect(deps.state()?.learner.target_level).toBe("C1");
  });

  test("does not call OpenAI below the threshold", async () => {
    const deps = providers(0.99);
    const result = await evaluateWord("rareword", "A rareword appeared here.", {
      ...deps,
      loadLookup: async () => new Map(),
    });

    expect(deps.wasGenerated()).toBe(false);
    expect(result.learningMaterial).toBeNull();
    expect(result.oxford).toEqual({ found: false, cefr: null });
  });

  test("bypasses Jev for Oxford 5000 words and goes straight to OpenAI", async () => {
    const deps = providers(Number.NaN);
    const result = await evaluateWord("underpin", "This idea underpins the plan.", {
      ...deps,
      loadLookup: async () => new Map([["underpin", "C1"]]),
    });

    expect(deps.wasGenerated()).toBe(true);
    expect(result.learningPriority).toBeNull();
    expect(result.learningMaterial).not.toBeNull();
  });
});
