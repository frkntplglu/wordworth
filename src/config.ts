import dotenv from "dotenv";
import { resolve } from "node:path";

dotenv.config({
  path: process.env.WORDWORTH_ENV_FILE?.trim() || resolve(process.cwd(), ".env"),
  quiet: true,
});

import { WordworthAppError } from "./cli/errors.ts";
import type { LearnerState } from "./domain/types.ts";
import { createJevProvider } from "./providers/jev.ts";
import { createOpenAIProvider } from "./providers/openai.ts";

export function createProviders() {
  return {
    jev: {
      async evaluate(state: LearnerState) {
        const jevApiKey = process.env.TYPESAFE_API_KEY?.trim();
        if (!jevApiKey) {
          throw new WordworthAppError(
            "TYPESAFE_API_KEY is missing. Add it to .env before running Wordworth.",
            "MISSING_TYPESAFE_API_KEY",
          );
        }
        return createJevProvider({
          apiKey: jevApiKey,
          baseURL: process.env.TYPESAFE_BASE_URL,
          model: process.env.TYPESAFE_DEFAULT_MODEL || "jev-latest",
        }).evaluate(state);
      },
    },
    openai: {
      async generate(state: Parameters<ReturnType<typeof createOpenAIProvider>["generate"]>[0]) {
        const openaiApiKey = process.env.OPENAI_API_KEY?.trim();
        if (!openaiApiKey) {
          throw new WordworthAppError(
            "OPENAI_API_KEY is missing. Add it to .env before running Wordworth.",
            "MISSING_OPENAI_API_KEY",
          );
        }
        return createOpenAIProvider({
          apiKey: openaiApiKey,
          model: process.env.OPENAI_MODEL || "gpt-4.1-nano",
        }).generate(state);
      },
    },
  };
}
