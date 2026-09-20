# Wordworth

Context-aware English vocabulary coaching in the terminal.

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

Copy `Formula/wordworth.rb` into a GitHub tap repository named `homebrew-wordworth`. After that tap is published, install it with:

```sh
brew tap furkantopaloglu/wordworth
brew install wordworth
```

The formula compiles a standalone executable and installs the Oxford dataset alongside it. Create `.env` in the directory where you run `wordworth`, or set `WORDWORTH_ENV_FILE` to an explicit environment-file path.

## Development

```sh
npm test
npm run typecheck
```

The local Oxford dataset is loaded from `oxford_5000_simple.json` at runtime.
