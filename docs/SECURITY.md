# Security Guide

## Reporting

Report suspected vulnerabilities privately through the repository's GitHub security advisory flow. Do not open a public issue with exploit details, credentials, cookies, or user data.

## Secrets and configuration

`NCB_SECRET_KEY` and `NCB_API_BASE_URL` are server/runtime-only values. Never prefix a secret with `VITE_`, commit `.env` files, or include real values in screenshots, logs, issues, or pull requests. Values prefixed `VITE_` are bundled for the browser and are not secret.

## NoCodeBackend trust boundary

The NoCodeBackend handler is deliberately an explicit contract rather than a generic proxy. It enforces route/method allowlists, same-origin checks for state-changing cookie requests, JSON and body-size restrictions, Zod request validation, upstream timeouts, constrained error statuses, and validated data responses. It forwards only required credentials and approved headers, while preserving correlation IDs for support.

Every data request first resolves the user from NoCodeBackend's server-side `get-session` endpoint using the incoming session cookie and server-held credential. A missing, rejected, or malformed session is denied; the browser's cached user is never an ownership authority. The handler rejects client-supplied `user_id` values that differ from the verified session identity, supplies the verified identity when it is omitted, and attaches that identity to list and item requests. This constrains collection reads plus item GET, PATCH, and DELETE operations to the session owner before a data upstream request is made.

NoCodeBackend deployments must therefore guarantee that `get-session` validates the supplied session cookie and returns the authenticated user object with a stable `id`. Data endpoints must honor the handler's `user_id` filter for reads, writes, and deletes, and enforce equivalent server-side record ownership checks. The proxy's filter is defense in depth, not a replacement for upstream authorization.

## Change checklist

1. Do not weaken route, method, origin/CSRF, body-limit, timeout, or schema validation without a documented threat-model review.
2. Keep authentication and data credentials server-side.
3. Do not log secrets, authorization headers, cookies, passwords, or sensitive user content.
4. Add contract tests for a changed proxy route or validation rule.
5. Verify data routes derive ownership from a trusted session and cannot use a browser-supplied identity.
6. Use `npm ci` for the lockfile-defined dependency graph and review dependency changes deliberately.
