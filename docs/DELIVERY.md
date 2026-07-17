# Delivery Guide

## Definition of done

A change is ready when it has a clear issue or pull request scope, focused tests for changed behavior, updated documentation where needed, and passing lint, type-check, test, and production-build commands. Perceptible web UI changes should include a screenshot in the pull request.

## Local delivery loop

1. Install the locked dependency graph with `npm ci`.
2. Start the application with `npm run dev`.
3. Make a small, reviewable change; do not commit `dist/`, `.env` files, or secrets.
4. Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.
5. Review `git diff --check` and `git status --short`, then use the pull request template to record scope, validation, risk, and rollout notes.

## Environments and configuration

The app uses Vite in development and deployment. The data and auth APIs are same-origin routes: `/api/ncb/data` and `/api/ncb/auth`. Server/runtime configuration supplies `NCB_API_BASE_URL` and `NCB_SECRET_KEY`; browser code may configure only `VITE_DATA_PROXY_URL` and `VITE_AUTH_PROXY_URL`.

## Release and rollback

Build with `npm run build` and deploy the generated `dist/` artifact through the hosting platform. Verify the application shell, authentication state, and a representative data request after deployment without exposing credentials. Roll back by redeploying the previously known-good artifact; do not attempt a browser-side fallback for failed domain-data requests.
