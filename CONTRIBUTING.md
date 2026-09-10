# Contributing to Evony Rally Coordinator

Thanks for your interest in contributing! This project is feature-complete for its current phase
("Public Beta" — see [`RELEASE_NOTES.md`](./RELEASE_NOTES.md)), so contributions are especially
welcome in the form of bug fixes, documentation improvements, accessibility fixes, and test
coverage.

## Before you start

Please read [`docs/PROJECT_SPECIFICATION.md`](./docs/PROJECT_SPECIFICATION.md) and
[`docs/ARCHITECTURE_DECISIONS.md`](./docs/ARCHITECTURE_DECISIONS.md) first. This project has a
deliberately narrow scope (a self-declared status board, not a management or scheduling tool), and
several design choices that might look like gaps — no admin UI, no Discord integration yet, no
attendance tracking — are intentional, not oversights. If you're planning a larger change, please
open an issue to discuss it before investing time in a pull request.

## Getting set up

```bash
npm install
cp .env.example .env.local   # optional — app runs in an "unconfigured" demo state without it
npm run dev
```

See the main [`README.md`](./README.md) for the full local development and Firebase setup
instructions.

## Before opening a pull request

Please confirm:

1. `npm run typecheck` passes.
2. `npm run lint` passes.
3. `npm run build` completes with no errors.
4. `npm run preview` — manually check the routes and viewports listed in the README's
   [Local development](./README.md#local-development) checklist.

Keep pull requests focused — one fix or feature per PR makes review much faster.

## Code style

- TypeScript throughout; keep `strict` mode passing.
- Tailwind utility classes using the design tokens in `tailwind.config.js` — see
  [`docs/DESIGN_SYSTEM.md`](./docs/DESIGN_SYSTEM.md) rather than raw hex/px values.
- Firestore Security Rules (`firestore.rules`) are the actual security boundary; any client-side
  validation is a UX nicety only and should never be relied on for enforcement.

## Reporting bugs

Open an issue with steps to reproduce, what you expected, and what happened instead. Screenshots
help a lot for UI issues.

## Reporting security issues

Please don't open a public issue for security vulnerabilities — see [`SECURITY.md`](./SECURITY.md)
instead.
