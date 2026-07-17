# Repository Guidance for Agents

## Scope and workflow

- Keep changes small, reviewable, and within the issue or pull request scope. Do not mix refactors, dependency upgrades, generated output, or unrelated formatting with a focused change.
- Read the relevant implementation, tests, and documentation before editing. Preserve the existing React, JavaScript, and TypeScript conventions.
- Update documentation and tests when a user-visible behavior, API contract, validation rule, security boundary, or contributor workflow changes.
- Do not commit secrets, real credentials, `.env` files, production data, or generated `dist/` output. Use placeholders in examples.
- Run the checks applicable to changed files before committing: `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

## React and Vite

- This is a React 18 application built and served with Vite. Keep browser code under `src/`; use the existing Vite aliases and scripts rather than adding another build tool.
- Prefer functional components and hooks. Keep components focused, use accessible native controls and labels, and preserve low-stimulation, keyboard-friendly interactions.
- Do not access secrets or server-only environment variables from `src/`. `VITE_*` values are exposed to the browser.
- Keep runtime validation at boundaries. Browser form data and proxy responses use the Zod schemas in `src/domains/schemas.js`; update the schemas and their contract tests when changing persisted record shapes.

## npm and validation

- The committed `package-lock.json` is authoritative. In CI and reproducible local installs, use `npm ci`; use `npm install` only when intentionally changing dependencies and commit the resulting lockfile.
- Do not hand-edit `package-lock.json`. Avoid dependency changes unless they are required and reviewed for security and compatibility.
- Required checks are `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. Note that `npm run build` runs lint before Vite's production build.

## NoCodeBackend proxy and security

- All NoCodeBackend traffic must go through the same-origin, allowlisted handlers in `api/ncb/`. Do not add a generic path proxy, expose `NCB_SECRET_KEY`, or send backend credentials from the browser.
- Only `NCB_API_BASE_URL` and `NCB_SECRET_KEY` belong in the server/runtime environment. Browser configuration may use only the proxy URL variables (`VITE_AUTH_PROXY_URL` and `VITE_DATA_PROXY_URL`).
- Preserve route allowlists, method allowlists, request-size limits, origin/CSRF checks, request and response validation, upstream timeouts, and structured error/correlation-ID behavior. Add or update handler contract tests for changes to this trust boundary.
- Never log authorization headers, cookies, passwords, secrets, or personally identifiable user content. Treat upstream responses as untrusted until validated.

## Tests and pull requests

- Add focused `node:test` coverage in `test/` for behavior and contracts. Tests must be deterministic and must not require real NoCodeBackend credentials or network access.
- Use GitHub Issue Forms and the pull request template. Explain behavior, risk, validation, and documentation changes in pull requests.
- Before requesting review, inspect `git diff --check` and `git status --short`; commit only intentional files.
