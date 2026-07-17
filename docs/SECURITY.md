# Security Guide

## Reporting

Report suspected vulnerabilities privately through the repository's GitHub security advisory flow. Do not open a public issue with exploit details, credentials, cookies, or user data.

## Secrets and configuration

`NCB_SECRET_KEY` and `NCB_API_BASE_URL` are server/runtime-only values. Never prefix a secret with `VITE_`, commit `.env` files, or include real values in screenshots, logs, issues, or pull requests. Values prefixed `VITE_` are bundled for the browser and are not secret.

## NoCodeBackend trust boundary

The NoCodeBackend handler is deliberately an explicit contract rather than a generic proxy. It enforces route/method allowlists, same-origin checks for state-changing cookie requests, JSON and body-size restrictions, Zod request validation, upstream timeouts, constrained error statuses, and validated data responses. It forwards only required credentials and approved headers, while preserving correlation IDs for support.

## Change checklist

1. Do not weaken route, method, origin/CSRF, body-limit, timeout, or schema validation without a documented threat-model review.
2. Keep authentication and data credentials server-side.
3. Do not log secrets, authorization headers, cookies, passwords, or sensitive user content.
4. Add contract tests for a changed proxy route or validation rule.
5. Use `npm ci` for the lockfile-defined dependency graph and review dependency changes deliberately.
