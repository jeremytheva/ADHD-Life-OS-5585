# ADHD Life-OS MVP

ADHD Life-OS is a React and Vite life-management MVP designed for supportive, low-stimulation task, routine, project, inbox, and home-management workflows.

## Current behavior

- **Tasks and prioritization:** create and organize tasks; optional energy, duration, interest, aversiveness, location, and item metadata informs Quick Wins, Momentum Builders, and Brave Frog recommendations.
- **Planning workflows:** use projects and subtasks, routines and routine sessions, a daily timeline, day setup, Brain Inbox capture, templates, and Home-mode housework checklists.
- **Personalization:** select roles and modules during onboarding; core navigation remains available, and accessibility preferences include font size, contrast, reduced motion, focus mode, dyslexic font, and line spacing.
- **Data and authentication:** browser requests go to same-origin, allowlisted NoCodeBackend auth and data proxy routes. Server-only credentials are used by those routes; validated failures are returned as structured errors rather than silently storing domain records in browser storage.

## Planned integrations and limits

External calendar/event synchronization is a planned integration area and is **not currently enabled**. Descriptions of scheduling and recommendations refer to existing in-app logic, not a promise of third-party calendar access, background synchronization, or remote AI services. See the [product overview](docs/PRODUCT.md) for the current product boundary.

## Documentation

- [Delivery guide](docs/DELIVERY.md): local delivery, environments, release, and rollback.
- [Product overview](docs/PRODUCT.md): current user behavior, principles, and planned-integration boundary.
- [Architecture](docs/ARCHITECTURE.md): React/Vite structure and NoCodeBackend request flow.
- [Data model](docs/DATA_MODEL.md): supported collections, relationships, and validation contracts.
- [Security guide](docs/SECURITY.md): secrets, proxy trust boundary, and reporting.
- [Testing guide](docs/TESTING.md): required checks, contract coverage, and manual validation.
- [Contributing guide](docs/CONTRIBUTING.md): setup and review expectations.
- [Codex workflow](docs/CODEX_WORKFLOW.md): agent-oriented implementation and completion process.
- [GitHub configuration](docs/GITHUB_CONFIGURATION.md): Issue Forms, pull requests, and CI.
- [ADR process](docs/ADR_PROCESS.md): documenting consequential technical decisions.

## Getting started

### Prerequisites

- Node.js 20 or later and npm.
- A NoCodeBackend environment for live authentication and data interactions. Tests do not require live credentials or network access.

### Install and run

```bash
git clone <repository-url>
cd ADHD-Life-OS
npm ci
npm run dev
```

Open `http://localhost:5173`.

### Configure the NoCodeBackend proxy

The browser defaults to `/api/ncb/auth` and `/api/ncb/data`. `VITE_AUTH_PROXY_URL` and `VITE_DATA_PROXY_URL` may override those browser-visible proxy paths.

Set `NCB_API_BASE_URL` and `NCB_SECRET_KEY` only in the server/runtime environment. Never expose `NCB_SECRET_KEY` through a `VITE_*` variable, commit `.env` files, or bypass the explicit proxy handlers. Development uses the same allowlisted handler contract as deployment.

The supported data collections are `user-preferences`, `tasks`, `projects`, `subtasks`, `routines`, `routine-steps`, `routine-sessions`, `housework-tasks`, `housework-completions`, and `inbox-items`. Details are in the [data model](docs/DATA_MODEL.md).

## Development and validation

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Available scripts:

- `npm run dev` — start Vite development server.
- `npm run build` — lint and create the production build.
- `npm run preview` — serve the production build locally.
- `npm run lint` — run ESLint.
- `npm run lint:error` — show ESLint errors only.
- `npm run typecheck` — run TypeScript without emitting files.
- `npm test` — run Node tests.

## Contributing

Please read [AGENTS.md](AGENTS.md), the [contributing guide](docs/CONTRIBUTING.md), and the [testing guide](docs/TESTING.md). Use the GitHub Issue Forms and pull request template, keep work focused, add tests when behavior changes, and do not include credentials or personal data.

## License and support

This project is licensed under the MIT License. For questions or support, open a repository discussion; report security vulnerabilities privately as described in the [security guide](docs/SECURITY.md).
