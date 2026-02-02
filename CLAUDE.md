<!-- vibe-rules Integration -->

<!-- vibe-rules Integration -->

# Claude Code Guidelines for Suberus

## Project Overview
Abstract management system for scientific conferences.

## Tech Stack
**Tech Stack:** [STACK.md](./STACK.md)

## Functionality 
Treat the [guidelines](./WORKFLOW.md) as the single source of truth. If a change in the application contradicts the contents of the file, you **MUST** obtain the user's permission. In such case, also correct the WORKFLOW.md to reflect the current state.


## Key Guidelines
- Use skills
- Communicate in the user's chosen language. Use English ONLY in code files, comments, commits, and documentation. In all interactions and commit messages, be extremely concise and sacrifice grammar for the sake of concision.
- Ask the user clarifying questions.
- **DO NOT agree with the user on everything. Maintain a rational approach and look for the best solution.**
- At the end of each plan, give me a list of unresolved questions to answer, if any. Make the questions extremely concise. Sacrifice grammar for the sake of concision.
- If you think user is wrong about  approach, library, or solution, suggest a better one.
- Use `pnpm` for package management
- Test emails via Mailpit UI (port 8025)
- Use TypeScript for type safety, avoid `any` type usage in code files or casting. Do not create additional types if current types cover the use case. Always check existing types first and propose changes if needed.
- Analyze similar parts of the codebase and determine whether your plan: is consistent with rest of codebase, introduces minimal changes, reuses existing code
- Always try to do only what the user has asked for. If he hasn't asked for something general or for your opinion, don't add it.
- If refactoring another part of the application is necessary to achieve the goal, always suggest this option.
- Follow existing code structure and patterns
- Keep components modular and reusable
- Use Prisma for database operations
- UI **MUST** be mobile friendly
- MUST Use Conventional Commits format when writing commit messages: https://www.conventionalcommits.org/en/v1.0.0

### Before Making Changes
- Read relevant code files first
- Check database schema in `prisma/schema.prisma`
- Always check [STACK.md](./STACK.md) to choose the right tech stack for the task
- Always check [WORKFLOW.md][./WORKFLOW.md] to see the rules of app

### After Making Changes
- Run `pnpm lint` to check for linting errors
- Run `pnpm build` to build production bundle

### Playwright Tests
- **ALWAYS** use `/playwright-best-practices` skill when writing or refactoring Playwright tests
- Tests are in `e2e/` directory
- Run tests: `pnpm exec playwright test`
- Use web-first assertions (`expect().toBeVisible()`) instead of `waitForTimeout()`

#### Test Data & Isolation
- **Seeded data**: Use `e2e/setup/global-setup.ts` for test data. Constants in test fixtures must match seeded data
- **Test isolation**: Each test suite should use unique seeded submissions. Don't share mutable data between suites
- **NO conditional skips** based on data availability. If test needs specific data, seed it in global-setup
- **Mobile skips**: Only skip tests where UI is genuinely different on mobile (sidebars hidden, tabs collapsed)

#### AAA Pattern (Arrange-Act-Assert)
- Structure tests with clear sections: Arrange (setup), Act (action), Assert (verify)
- Don't use conditional logic (`if` checks) inside tests - assert the expected state directly
- Control initial state via seeded data, don't check "if data exists" and skip

#### Seeded Submissions (global-setup.ts)
| Title | Status | Purpose |
|-------|--------|---------|
| Test Submission Title for E2E | SUBMITTED | General tests |
| Submission for Desk Reject Test | SUBMITTED | Desk reject in e2e/reviews |
| Submission Under Review for E2E | UNDER_REVIEW | Reviewer tests (has assignment) |
| Submission Awaiting Decision for E2E | AWAITING_DECISION | Decision tests (has completed review) |
| Desk Reject Test for Workflows | SUBMITTED | Desk reject in e2e/workflows |
| Awaiting Decision for Workflows | AWAITING_DECISION | Decision in e2e/workflows |

#### Submission Type Config (from seeded settings)
- `ABSTRACT` → `ORAL_PRESENTATION` config: `enableScoring: true`, `reviewMode: DOUBLE_BLIND`
- Tests for scoring/double-blind should assert these behaviors, not skip if missing

## TanStack Start 
When working with Tanstack Start related code **ALWAYS** read tanstack-llms\llms.md first and follow that documentation to better understand library.

### Key Points
- Use `.inputValidator()` with Zod schemas (NOT `.validator()`)
- Separate server-only code in `.server.ts` files
- Keep `.functions.ts` files thin - just wrappers
- Throw `Response` for HTTP errors (401, 403, 404, etc.)
- Use `getRequestHeaders()` (NOT `getHeaders()`) for auth
- Import `auth` with relative path from `.functions.ts` files
