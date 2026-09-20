import { score, TypeSafeClient } from "@typesafe-ai/sdk";
import {
  LEARNING_PRIORITY_CRITERIA,
  LEARNING_PRIORITY_INSTRUCTIONS,
} from "../domain/constants.ts";
import type { LearnerState } from "../domain/types.ts";

export type JevConfig = {
  apiKey: string;
  baseURL?: string;
  model?: string;
};

export type JevProvider = {
  evaluate(state: LearnerState): Promise<number>;
};

export function createJevProvider(config: JevConfig): JevProvider {
  const client = new TypeSafeClient({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    defaultModel: config.model ?? "jev-latest",
    logLevel: "off",
  });

  return {
    async evaluate(state) {
      const question = score(
        LEARNING_PRIORITY_INSTRUCTIONS,
        LEARNING_PRIORITY_CRITERIA,
      );
      const response = await client.systemOne({
        state,
        questions: { learning_priority: question },
        model: config.model ?? "jev-latest",
      });
      const value = response.answers.learning_priority.score;
      if (!Number.isFinite(value)) {
        throw new Error("Jev returned an invalid learning-priority score.");
      }
      return value;
    },
  };
}
