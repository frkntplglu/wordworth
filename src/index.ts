#!/usr/bin/env bun

import { parseArgs, CliArgumentError, HELP_TEXT } from "./cli/args.ts";
import { WordworthAppError, toWordworthError } from "./cli/errors.ts";
import { createProviders } from "./config.ts";
import { evaluateWord } from "./domain/pipeline.ts";
import { serializeJson } from "./output/json.ts";
import { TuiApp, TuiCancelledError } from "./tui/app.ts";

function writeJson(value: Parameters<typeof serializeJson>[0]) {
  process.stdout.write(`${serializeJson(value)}\n`);
}

async function run() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    const appError =
      error instanceof CliArgumentError
        ? new WordworthAppError(error.message, error.code)
        : error;
    if (process.argv.includes("--json")) {
      writeJson(toWordworthError(appError));
    } else {
      process.stderr.write(`${appError instanceof Error ? appError.message : String(appError)}\n`);
      process.stderr.write("Run `wordworth --help` for usage.\n");
    }
    process.exitCode = 2;
    return;
  }

  if (options.help) {
    process.stdout.write(HELP_TEXT);
    return;
  }

  if (!options.word) {
    const error = new WordworthAppError("A word is required.", "MISSING_WORD");
    if (options.json) writeJson(toWordworthError(error));
    else process.stderr.write(`${error.message}\nRun \`wordworth --help\` for usage.\n`);
    process.exitCode = 2;
    return;
  }

  if (options.json && !options.context) {
    writeJson(
      toWordworthError(
        new WordworthAppError(
          "Context is required in --json mode.",
          "MISSING_CONTEXT",
        ),
      ),
    );
    process.exitCode = 2;
    return;
  }

  const tui = options.json ? null : new TuiApp();
  let currentWord = options.word;
  let currentContext = options.context;
  try {
    while (true) {
      try {
        if (!currentContext && tui) {
          currentContext = await tui.promptContext(currentWord);
        }
        if (!currentContext) {
          throw new WordworthAppError("Context cannot be empty.", "MISSING_CONTEXT");
        }

        const providers = createProviders();
        const result = await evaluateWord(
          currentWord,
          currentContext,
          providers,
          async (stage) => {
            if (tui) await tui.showProgress(currentWord, currentContext!, stage);
          },
        );

        if (options.json) {
          writeJson(result);
          return;
        }

        const action = await tui!.showResult(result);
        if (action === "quit") return;
        currentWord = await tui!.promptWord();
        currentContext = await tui!.promptContext(currentWord);
      } catch (error) {
        if (error instanceof TuiCancelledError) {
          process.exitCode = 130;
          return;
        }
        const serialized = toWordworthError(error);
        if (options.json) {
          writeJson(serialized);
          process.exitCode = 1;
          return;
        }

        const action = await tui!.showError(currentWord, serialized);
        if (action === "quit") {
          process.exitCode = 1;
          return;
        }
        currentWord = await tui!.promptWord();
        currentContext = await tui!.promptContext(currentWord);
      }
    }
  } finally {
    await tui?.close();
  }
}

await run();
