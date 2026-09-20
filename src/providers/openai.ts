import OpenAI from "openai";
import { LEARNING_MATERIAL_SCHEMA } from "../domain/constants.ts";
import type { LearningMaterial, LearnerState } from "../domain/types.ts";

export type OpenAIConfig = {
  apiKey: string;
  model?: string;
};

export type OpenAIProvider = {
  generate(state: LearnerState): Promise<LearningMaterial>;
};

function isLearningMaterial(value: unknown): value is LearningMaterial {
  if (!value || typeof value !== "object") return false;
  const material = value as Record<string, unknown>;
  return (
    typeof material.definition === "string" &&
    typeof material.usage === "string" &&
    typeof material.example === "string"
  );
}

export function createOpenAIProvider(config: OpenAIConfig): OpenAIProvider {
  const client = new OpenAI({ apiKey: config.apiKey });

  return {
    async generate(state) {
      const response = await client.chat.completions.create({
        model: config.model ?? "gpt-4.1-nano",
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "You create precise English vocabulary learning material for a C1 learner. Return only the requested structured object. Keep every field in English. Use the sentence to identify the intended meaning, but make the usage guidance useful beyond that single topic.",
          },
          {
            role: "user",
            content: JSON.stringify({
              word: state.word,
              sentence: state.sentence,
              learner: state.learner,
              task: {
                definition:
                  "Give a concise learner-friendly definition for the meaning used in the sentence.",
                usage:
                  "Explain how the word is normally used, including register, grammar, collocations, or contrast when useful.",
                example:
                  "Write one natural example sentence that is different from the supplied sentence.",
              },
            }),
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "wordworth_learning_material",
            strict: true,
            schema: LEARNING_MATERIAL_SCHEMA,
          },
        },
      });

      const content = response.choices[0]?.message.content;
      if (!content) {
        throw new Error("OpenAI returned an empty learning-material response.");
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch (error) {
        throw new Error("OpenAI returned invalid learning-material JSON.", {
          cause: error,
        });
      }

      if (!isLearningMaterial(parsed)) {
        throw new Error("OpenAI returned an invalid learning-material shape.");
      }
      return parsed;
    },
  };
}
