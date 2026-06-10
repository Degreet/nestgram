# Contributing to Nestgram

Thanks for your interest in improving Nestgram! This guide covers the local
setup and the conventions the project follows.

## Prerequisites

- Node.js 18+
- npm

## Setup

```bash
git clone https://github.com/Degreet/nestgram.git
cd nestgram
npm install
```

`npm install` also installs the Git hooks (via Husky).

## Project layout

Source lives in `lib/` (not `src/`); build output goes to `dist/`. Files are
kebab-case, and types live beside the feature they describe. See
[VISION.md](./VISION.md) for the design rationale and locked decisions.

## Development workflow

| Command              | What it does                             |
| -------------------- | ---------------------------------------- |
| `npm run build`      | Compile the framework (`nest build`).    |
| `npm test`           | Run the Jest suite (`lib/**/*.spec.ts`). |
| `npm run test:watch` | Run Jest in watch mode.                  |
| `npm run lint`       | Lint with ESLint.                        |
| `npm run format`     | Format with Prettier.                    |
| `npm run typecheck`  | Type-check without emitting.             |

The framework compiles under `strict: true` — keep it that way (model the types,
no `any`-casts to silence the checker).

## Git hooks

Installed automatically on `npm install`:

- **pre-commit** — runs `lint-staged`: Prettier on staged files and ESLint
  `--fix` on staged `lib/**/*.ts`.
- **pre-push** — runs the full test suite; a push is blocked if tests fail.

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/): `type(scope):
subject` — common types are `feat`, `fix`, `refactor`, `chore`, `docs`, `test`.
One logical change per commit; the subject is imperative and under 72 chars.

## Pull requests

- Describe the problem, the change, and how to verify it.
- Make sure `npm test`, `npm run lint`, and `npm run build` all pass.
- Add or update tests for any behaviour you change.

## License

By contributing, you agree that your contributions are licensed under the
project's [MIT License](./LICENSE).
