import type { WordworthError } from "../domain/types.ts";

export class WordworthAppError extends Error {
  constructor(
    message: string,
    readonly code: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "WordworthAppError";
  }
}

export function toWordworthError(error: unknown): WordworthError {
  if (error instanceof WordworthAppError) {
    return { error: { code: error.code, message: error.message } };
  }
  if (error instanceof Error) {
    return { error: { code: "PROVIDER_ERROR", message: error.message } };
  }
  return {
    error: { code: "UNKNOWN_ERROR", message: "An unknown error occurred." },
  };
}
