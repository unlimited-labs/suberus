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
