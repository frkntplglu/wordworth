import { LEARNER } from "./constants.ts";
import type {
  ProgressStage,
  WordworthResult,
  LearnerState,
} from "./types.ts";
import { lookupOxford, loadOxfordLookup } from "../data/oxford.ts";
import type { JevProvider } from "../providers/jev.ts";
import type { OpenAIProvider } from "../providers/openai.ts";

export type ProgressReporter = (stage: ProgressStage) => void | Promise<void>;

export type PipelineDependencies = {
  jev: JevProvider;
  openai: OpenAIProvider;
  loadLookup?: typeof loadOxfordLookup;
};

export async function evaluateWord(
  word: string,
  context: string,
  dependencies: PipelineDependencies,
  onProgress: ProgressReporter = () => undefined,
): Promise<WordworthResult> {
  const normalizedWord = word.trim();
  const normalizedContext = context.trim();
  if (!normalizedWord) throw new Error("Word cannot be empty.");
  if (!normalizedContext) throw new Error("Context cannot be empty.");

  await onProgress("Oxford lookup");
  const lookup = await (dependencies.loadLookup ?? loadOxfordLookup)();
  const oxford = lookupOxford(lookup, normalizedWord);
  const state: LearnerState = {
    word: normalizedWord,
    sentence: normalizedContext,
    learner: LEARNER,
  };

  let score: number | null = null;
  if (!oxford.found) {
    await onProgress("Jev evaluation");
    score = await dependencies.jev.evaluate(state);
  }

  let learningMaterial = null;
  if (oxford.found || (score !== null && score >= 1)) {
    await onProgress("Learning material");
    learningMaterial = await dependencies.openai.generate(state);
  }

  await onProgress("Complete");
  return {
    word: normalizedWord,
    context: normalizedContext,
    oxford,
    learningPriority: score === null ? null : { score },
    learningMaterial,
  };
}
