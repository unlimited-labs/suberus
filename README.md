<div align="center">

<!-- Light logo for light themes, dark-theme variant for dark themes (GitHub picks by prefers-color-scheme) -->
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="public/logo_dark.svg" />
  <img src="public/logo.svg" alt="Suberus" width="160" />
</picture>


### **Abstract & peer-review management for scientific conferences**


</div>

---

## What it does

Suberus runs the full lifecycle of a conference call for submissions: authors submit, editors assign reviewers, reviewers score, decisions are made, and accepted work lands on the program. Everything that drives behaviour — reviewer counts, blinding, scoring criteria, deadlines — is configuration, not code.

- **Multiple submission types** — abstracts, full papers, posters, and exhibitor presentations, each with independent configuration. Enable any combination per conference.
- **Configurable review workflow** — single- or multi-reviewer flows, reviewer-decides vs. editor-decides, multi-round revise-and-resubmit, with full version history. State transitions are validated through an [XState](https://stately.ai/docs) machine.
- **Blind review** — OPEN / SINGLE BLIND / DOUBLE BLIND per submission type.
- **Editorial control** — desk accept/reject, decision overrides with reasoning, bulk decisions, custom scoring criteria.
- **Program planner** — schedule accepted submissions into sessions, with drag-and-drop and an autoplan helper.
- **Exhibitor flow** — company applications and presentations on a separate, non-reviewed track.
- **Email templates** — database-stored, placeholder-driven notifications for every workflow event.
- **Immutable audit trail** — every user, submission, review, and decision event is logged.

## Quick start

**Prerequisites:** Node.js 22+, pnpm, and Docker (managed via [proto](https://moonrepo.dev/proto) — run `proto install` to get the pinned toolchain).

```bash
# 1. Install dependencies
pnpm install
# 2. Start infrastructure (PostgreSQL, Garage storage, Mailpit)
docker compose up -d
# 3. Configure environment
cp .env.example .env   # then fill in DB, storage, and SMTP values
# 4. Set up the database
pnpm db:update
# 5. Run the dev server
pnpm dev
```

The app is served at **http://localhost:3001**.

## Project structure

Suberus follows a **feature-first** layout: each feature is a vertical slice under `src/features/`, with a thin shared layer in `src/shared/`.

```
src/
├── features/        # vertical slices (submissions, workflow, planner,
│                    #   settings, exhibitors, activity-log, …)
├── shared/          # cross-cutting building blocks
├── routes/          # TanStack Router file-based routes
└── lib/             # low-level helpers
docs/                # end-user admin manual (Starlight, own lockfile)
dev-docs/            # internal engineering docs
```


## Documentation
- **Admin manual** — Starlight site available at [docs.suberus.app](https://docs.suberus.app) or in `docs/`

## License

Released under the [MIT License](LICENSE).
