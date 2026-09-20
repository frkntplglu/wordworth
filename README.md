# Wordworth

Context-aware English vocabulary coaching in the terminal.

Wordworth is free and open-source software released under the MIT License.

## Features

- Oxford 5000 CEFR lookup from a local dataset
- Jev learning-priority scoring for words outside Oxford 5000
- English learning material generated with `gpt-4.1-nano`
- Interactive OpenTUI interface with a JSON output mode
- Multi-word sessions without restarting the CLI

## Requirements

- Bun 1.3 or newer
- An OpenAI API key
- A TypeSafe API key for words that are not in Oxford 5000

## Setup

```sh
npm install
cp .env.example .env
```

Fill in `OPENAI_API_KEY`. `TYPESAFE_API_KEY` is required only for words that are not in Oxford 5000; Oxford-listed words skip Jev and go directly to OpenAI.

Run with Bun:

```sh
bun run src/index.ts underpin --context "This idea underpins the plan."
```

When `--context` is omitted in the default mode, Wordworth opens an OpenTUI prompt:

```sh
bun run src/index.ts underpin
```

On the result screen, press `n` to explore another word, or `q`/`Esc` to quit.

For scripts and pipelines, provide context and request JSON:

```sh
bun run src/index.ts underpin --json --context "This idea underpins the plan."
```

JSON mode writes exactly one JSON object to stdout and never opens the interactive prompt. Oxford-listed words have `learningPriority: null` because Jev is skipped. For other words, a score below `1` produces `learningMaterial: null` and does not call OpenAI.

## Homebrew

The repository includes a Homebrew formula. From a checkout, install using the local formula definition:

```sh
brew install --build-from-source ./Formula/wordworth.rb
```

If you want to use the current repository as a custom tap, run:

```sh
brew tap frkntplglu/wordworth https://github.com/frkntplglu/wordworth.git
brew install frkntplglu/wordworth/wordworth
```

For the shorter `brew tap frkntplglu/wordworth` form, create a separate public repository named `homebrew-wordworth`, copy `Formula/wordworth.rb` into its `Formula/` directory, and push it. Then users can run:

```sh
brew install frkntplglu/wordworth/wordworth
```

The formula compiles a standalone executable and installs the Oxford dataset alongside it. Create `.env` in the directory where you run `wordworth`, or set `WORDWORTH_ENV_FILE` to an explicit environment-file path.

## Configuration

Copy `.env.example` to `.env` and add your provider credentials:

```dotenv
OPENAI_API_KEY=your_openai_api_key
TYPESAFE_API_KEY=your_typesafe_api_key
```

`OPENAI_API_KEY` is required when learning material is generated. `TYPESAFE_API_KEY` is only required for words that are not in Oxford 5000 and therefore need Jev evaluation.

## Development

```sh
npm test
npm run typecheck
```

The local Oxford dataset is loaded from `oxford_5000_simple.json` at runtime.

## License and data attribution

The original Wordworth source code and documentation are licensed under the [MIT License](LICENSE).

The Oxford dataset is included as a normalized data file and may have separate upstream terms from the application code. Review and preserve its original attribution and redistribution terms before distributing modified copies of the dataset.

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines and [SECURITY.md](SECURITY.md) for private vulnerability reports.
