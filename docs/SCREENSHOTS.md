# Screenshot checklist — Suberus Admin Manual

Numbered list of every screenshot in the docs (all captured and embedded).

**Regenerating:** screenshots are captured automatically by
`e2e/screenshots/docs-screenshots.spec.ts` against a seeded sample conference
("ICCMS 2026"):

```bash
E2E_WORKERS=1 DOCS_SHOTS=1 pnpm exec playwright test --project=screenshots
```

Shot **03** (installer) additionally needs an empty-DB instance: create+migrate a
fresh DB, start `.output-e2e/server/index.mjs` against it, and pass its URL via
`DOCS_INSTALL_URL` (the test is skipped otherwise).

**App routes** are relative to the admin app (e.g. `https://<host>/admin/...`).
Settings tabs deep-link via `?tab=<id>`.

## Capture conventions
- **Width:** desktop ~1440px (matches the docs content width).
- **Theme:** capture in the theme you want shown (the manual supports light + dark).
- **Data:** use a realistic seed — empty states look poor (esp. dashboard, lists, planner).
- **File location:** save under `docs/src/assets/screenshots/` and embed in the page,
  e.g. `![Conference tab](../../../assets/screenshots/01-...png)`, replacing the placeholder line.
- **Naming:** `NN-<section>-<slug>.png` (numbers below).

---

## Part 1 — Configuration  (`/admin/settings?tab=…`)

- [x] **01** — `configuration/quick-start.mdx` — *admin login screen* — `/login`
- [x] **02** — `configuration/quick-start.mdx` — *Configuration tabs* (top bar) — `/admin/settings`
- [x] **03** — `configuration/first-time-install.mdx` — *Setup Suberus screen* — `/install` *(fresh instance only)*
- [x] **04** — `configuration/conference.mdx` — *Conference tab* (3 sections) — `/admin/settings?tab=conference`
- [x] **05** — `configuration/submissions.mdx` — *Submissions tab* (validation + extraction) — `/admin/settings?tab=submissions`
- [x] **06** — `configuration/submission-types.mdx` — *Submission Types — three accordions* — `/admin/settings?tab=types`
- [x] **07** — `configuration/tracks.mdx` — *Tracks tab* (list + Create) — `/admin/settings?tab=tracks`
- [x] **08** — `planner/setup.mdx` — *Program tab* (Planner + Rooms + Program Tracks) — `/admin/settings?tab=program`
- [x] **09** — `configuration/email-templates.mdx` — *Email Templates tab* (footer + list) — `/admin/settings?tab=emails`
- [x] **10** — `configuration/branding.mdx` — *Branding tab* — `/admin/settings?tab=branding`
- [x] **11** — `configuration/fee.mdx` — *Fee tab* (types + instructions) — `/admin/settings?tab=fee`
- [x] **12** — `configuration/reminders.mdx` — *Reminders tab* (3 groups) — `/admin/settings?tab=reminders`
- [x] **13** — `configuration/survey.mdx` — *Survey tab* (question list) — `/admin/settings?tab=survey`
- [x] **14** — `configuration/terms-of-service.mdx` — *Terms of Service tab, **Preview** mode* — `/admin/settings?tab=tos`
- [x] **15** — `configuration/invitations.mdx` — *Invitations tab* (validity hours) — `/admin/settings?tab=invitations`

*(`configuration/roles-and-permissions.mdx` has no screenshot — tables only.)*

---

## Part 2 — Managing the conference

- [x] **16** — `managing/quick-start.mdx` — *Admin dashboard* (whole) — `/admin/dashboard`
- [x] **17** — `managing/dashboard.mdx` — *Dashboard* — metrics + sparklines + system health — `/admin/dashboard`
- [x] **18** — `managing/submissions.mdx` — *Submissions list* (table + toolbar) — `/admin/submissions`
- [x] **19** — `managing/submissions.mdx` — *Submission detail — Content tab with version selector* — `/admin/submissions/<id>`
- [x] **20** — `managing/reviews.mdx` — *Assign reviewer dialog* (open) — `/admin/submissions/<id>` → Assign reviewer
- [x] **21** — `managing/users.mdx` — *Users list* (columns + survey columns) — `/admin/users`
- [x] **22** — `managing/users.mdx` — *User detail actions* (incl. Allow late submission) — `/admin/users/<id>`
- [x] **23** — `managing/users.mdx` — *User submissions panel* — `/admin/users/<id>`
- [x] **24** — `managing/invitations.mdx` — *Invitations list* — `/admin/invitations`
- [x] **25** — `planner/overview.mdx` — *Program Planner calendar* (rooms × days) — `/admin/program-planner`
- [x] **26** — `managing/extraction.mdx` — *Extraction status on a submission* (DOCX) — `/admin/submissions/<id>`
- [x] **27** — `managing/activity-log.mdx` — *Activity history on a submission* — `/admin/submissions/<id>` → history section
- [x] **33** — `managing/bulk-email.mdx` — *Email campaigns composer* (recipients, format, body, placeholders) — `/admin/bulk-email/<id>`
- [x] **34** — `managing/submissions.mdx` — *Version compare — side-by-side, highlighted diff* — `/admin/submissions/<id>/compare?view=split`

---

## Part 3 — Program Planner  (`/admin/program-planner`)

- [x] **28** — `planner/manual-scheduling.mdx` — *Session editor* (chairs + presentations) — open a session → right panel
- [x] **29** — `planner/manual-scheduling.mdx` — *Reading mode* (full-screen submission reader) — sidebar → **Read**
- [x] **30** — `planner/autoplanner.mdx` — *Auto-plan proposal preview* (session cards + stats) — `/admin/program-planner/auto-plan` → **Generate proposal**
- [x] **31** — `planner/publishing.mdx` — *Publish dialog* (pre-publish issue checks) — header **Publish**
- [x] **32** — `planner/publishing.mdx` — *Public program* (parallel sessions, chairs, breaks) — `/program`

---

## Notes on the tricky ones
- **03 (installer):** only reachable before the system is installed; capture on a fresh DB / e2e instance.
- **14 (ToS):** switch to the **Preview** tab, not Edit.
- **19, 20, 26, 27:** open a specific submission (version selector / open dialog / DOCX upload / history section).
- **22, 23:** open a specific user; **22** needs the action area (incl. *Allow late submission*).
- **30 (autoplan):** needs the LLM + clustering services reachable (`LLM_API_URL`, `PLANNER_API_URL`); the test skips itself if either is down. Captures the *result preview*, not the transient stage screen.
- **32 (public program):** publishes the schedule via the `setSchedulePublished(true)` helper, captures `/program`, then restores draft.
