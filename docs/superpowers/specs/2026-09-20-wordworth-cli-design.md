# Wordworth CLI Design

Date: 2026-09-20
Status: Approved design; implemented

## Goal

Build a TypeScript CLI named `wordworth` that evaluates an English word in a user-provided example sentence, uses the local Oxford 5000 dataset for CEFR lookup, asks Jev to score active-learning priority, and conditionally asks `gpt-4.1-nano` to create English learning material.

The default output is a polished OpenTUI terminal interface. The `--json` mode emits one machine-readable JSON object to stdout with no animation or explanatory text.

## User-facing contract

```text
wordworth WORD
wordworth WORD --context "EXAMPLE SENTENCE"
wordworth WORD --json --context "EXAMPLE SENTENCE"
```

- `WORD` is required.
- `--context` is optional in the default interactive mode. If omitted, OpenTUI asks for it in a focused prompt.
- In `--json` mode, `--context` is required. Missing context produces only a JSON error object and a non-zero exit code; no prompt is opened.
- Word lookup is case-insensitive and trims surrounding whitespace.
- The context is passed to the model exactly as entered apart from trimming leading/trailing whitespace.

## Runtime and dependencies

- TypeScript running on Bun 1.3+.
- `@opentui/core` for the terminal renderer, input, layout, loading states, and result panels.
- `@typesafe-ai/sdk` for Jev's `TypeSafeClient.systemOne` API.
- `openai` for the official OpenAI client.
- `dotenv` for local `.env` loading.
- A TypeScript execution/build setup appropriate for Bun.

The project may be installed with npm, but runtime scripts should use Bun because the current OpenTUI core documentation supports Bun as the straightforward TypeScript runtime.

## Pipeline

1. Parse `WORD`, optional `--context`, and optional `--json`.
2. Load and normalize `oxford_5000_simple.json`. Its current shape is an object whose numeric keys contain `{ word, cefr }` entries. Build a lowercase word-to-CEFR lookup map; duplicate entries are deduplicated.
3. Resolve context:
   - default mode: show an OpenTUI input prompt if no context was supplied;
   - JSON mode: fail with a JSON error if context is absent.
4. Construct the learner state:

   ```json
   {
     "word": "<WORD>",
     "sentence": "<CONTEXT>",
     "learner": {
       "target_level": "C1",
       "context": "Living in a foreign country and using English for daily communication.",
       "goals": [
         "Speak naturally in everyday conversations",
         "Build friendships and participate in social conversations",
         "Handle shopping, housing, appointments, travel, and public services",
         "Express opinions, feelings, and experiences clearly",
         "Communicate confidently at work",
         "Understand English articles, news, and other everyday resources"
       ]
     }
   }
   ```

5. If the word is found in Oxford 5000, skip Jev entirely and call OpenAI directly with model `gpt-4.1-nano`.
6. Otherwise, ask Jev one score question named `learning_priority`. Its instructions and criteria are the user-provided wording, preserved in the provider/domain layer. The question asks how worthwhile actively learning the word is in the meaning used by the sentence, considering everyday, social, professional, and C1 communication.
7. Read Jev's numeric score. If `score >= 1`, call OpenAI with model `gpt-4.1-nano` and request a strict structured learning-material response in English. If `score < 1`, skip OpenAI and set `learningMaterial` to `null`.
8. Render either the TUI result or the JSON result.

## JSON output

Successful output has this shape:

```json
{
  "word": "tenacious",
  "context": "She was tenacious during the negotiations.",
  "oxford": {
    "found": true,
    "cefr": "c1"
  },
  "learningPriority": {
    "score": 1.42
  },
  "learningMaterial": {
    "definition": "...",
    "usage": "...",
    "example": "..."
  }
}
```

When Jev returns a score below `1`, the same schema is returned with `learningMaterial: null`. The evaluation remains visible through `learningPriority.score`. For Oxford 5000 matches, Jev is skipped and `learningPriority` is `null`.

Errors use this shape and exit non-zero:

```json
{
  "error": {
    "code": "MISSING_CONTEXT",
    "message": "Context is required in --json mode."
  }
}
```

In JSON mode, stdout must contain only the JSON document. Diagnostics must not be printed to stdout.

## Learning-material contract

All generated content is English. The OpenAI response must contain:

- `definition`: a concise learner-friendly definition for the sentence's meaning;
- `usage`: practical usage guidance, including register or collocations when useful;
- `example`: a natural example sentence.

The OpenAI client request uses structured output/schema validation so malformed model text cannot silently become invalid CLI JSON.

## TUI design

The default screen uses a restrained dark editorial palette:

- a compact Wordworth header with the target word and context;
- a status/loading row that advances through `Oxford lookup`, `Jev evaluation`, and, when applicable, `Learning material`;
- a primary priority card with numeric score and Oxford CEFR badge, or an Oxford-match/Jev-skipped state;
- material cards for Definition, Usage, and Example;
- a footer with `n` to start a new word and `q`/Escape to quit.

After a result or error screen, the user can press `n` to enter another word and
context without restarting the process. JSON mode remains one-shot.

If the score is below `1`, the score card clearly says that active learning material was not generated because the word is currently low priority. The result screen still shows the word, context, Oxford result, and score.

If the word is in Oxford 5000, the priority card clearly says that Jev was skipped and the word went directly to learning-material generation.

All OpenTUI renderer instances are destroyed on normal completion, errors, and interrupt paths.

## Modules

```text
src/
  index.ts                 orchestration and process lifecycle
  cli/args.ts              argument parsing and validation
  cli/errors.ts            stable error codes and serialization
  data/oxford.ts           Oxford JSON loading and lookup
  domain/types.ts          pipeline and output types
  domain/pipeline.ts       lookup -> Jev -> conditional OpenAI flow
  providers/jev.ts         TypeSafeClient adapter
  providers/openai.ts      OpenAI adapter and structured response parsing
  tui/app.ts               OpenTUI renderer lifecycle
  tui/screens.ts           prompt, loading, result, and error views
  output/json.ts            JSON-only serialization
```

Provider adapters expose typed methods so the domain pipeline does not depend on SDK-specific response objects.

## Environment

`.env.example` will document:

```dotenv
TYPESAFE_API_KEY=
TYPESAFE_DEFAULT_MODEL=jev-latest
TYPESAFE_BASE_URL=https://api.typesafe.ai
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-nano
```

Secrets are never logged or committed. Missing provider credentials produce explicit TUI errors or JSON error objects.

## Error handling

- Invalid/missing word: usage error, with JSON serialization in `--json` mode.
- Missing interactive context after prompt cancellation: user-facing cancellation error.
- Missing JSON context: `MISSING_CONTEXT` JSON error.
- Invalid Oxford dataset: `DATASET_ERROR`.
- Missing Jev or OpenAI credentials: provider-specific configuration error.
- Network, authentication, rate-limit, and malformed provider responses: normalized provider error with a non-zero exit code.
- If Jev succeeds with `score < 1`, OpenAI is not called and this is a successful result, not an error.

## Verification

Tests and checks will cover:

- argument parsing and `--json` context rules;
- case-insensitive Oxford lookup and missing-word behavior;
- learner-state and Jev-question shape;
- Oxford-match bypass behavior, including no Jev call;
- score threshold behavior at `0.99`, `1`, and `1.01` for non-Oxford words;
- OpenAI call suppression below `1`;
- structured learning-material parsing;
- JSON mode's stdout-only contract;
- TUI rendering through OpenTUI's testable boundaries where available;
- TypeScript checks, formatting, and a smoke run with mocked providers.
