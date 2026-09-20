export type CliOptions = {
  word: string | null;
  context: string | null;
  json: boolean;
  help: boolean;
};

export class CliArgumentError extends Error {
  readonly code = "INVALID_ARGUMENTS";
}

export function parseArgs(argv: string[]): CliOptions {
  let word: string | null = null;
  let context: string | null = null;
  let json = false;
  let help = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--json") {
      json = true;
      continue;
    }
    if (argument === "--help" || argument === "-h") {
      help = true;
      continue;
    }
    if (argument === "--context") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new CliArgumentError("--context requires an example sentence.");
      }
      context = value;
      index += 1;
      continue;
    }
    if (argument.startsWith("--context=")) {
      const value = argument.slice("--context=".length);
      if (!value) throw new CliArgumentError("--context cannot be empty.");
      context = value;
      continue;
    }
    if (argument.startsWith("-")) {
      throw new CliArgumentError(`Unknown option: ${argument}`);
    }
    if (word !== null) {
      throw new CliArgumentError("Only one word may be provided.");
    }
    word = argument;
  }

  return { word, context, json, help };
}

export const HELP_TEXT = `Wordworth — context-aware English vocabulary coach

Usage:
  wordworth WORD [--context "EXAMPLE SENTENCE"]
  wordworth WORD --json --context "EXAMPLE SENTENCE"

Options:
  --context TEXT  Example sentence. Prompted interactively when omitted.
  --json          Print only machine-readable JSON. Context is required.
  -h, --help      Show this help.
`;
