import type { WordworthError, WordworthResult } from "../domain/types.ts";

export function serializeJson(value: WordworthResult | WordworthError): string {
  return JSON.stringify(value);
}
