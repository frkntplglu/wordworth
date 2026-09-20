# Contributing to Wordworth

Thank you for helping improve Wordworth. Contributions, bug reports, documentation fixes, and feature ideas are welcome.

## Development setup

Requirements:

- Bun 1.3 or newer
- Node.js and npm for dependency installation
- An OpenAI API key for learning-material generation
- A TypeSafe API key for words that are not in the Oxford 5000 list

```sh
git clone https://github.com/frkntplglu/wordworth.git
cd wordworth
npm install
cp .env.example .env
```

Run the checks before opening a pull request:

```sh
npm run typecheck
npm test
```

## Pull requests

- Keep changes focused and explain the user-facing impact.
- Add or update tests when behavior changes.
- Keep generated learning content in English.
- Do not commit `.env`, API keys, or other credentials.
- Update the README when commands or public behavior change.

Please use a clear commit message and describe how you verified the change.

## Code of conduct

Be respectful, constructive, and welcoming. Harassment, discrimination, and personal attacks are not acceptable.

By participating, you agree to follow these standards in all project spaces.
