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

## Part 1 — Settings  (`/admin/settings?tab=…`)

- [x] **01** — `settings/quick-start.mdx` — *admin login screen* — `/login`
- [x] **02** — `settings/quick-start.mdx` — *Settings tabs* (top bar) — `/admin/settings`
- [x] **03** — `settings/first-time-install.mdx` — *Setup Suberus screen* — `/install` *(fresh instance only)*
- [x] **04** — `settings/conference.mdx` — *Conference tab* (3 sections) — `/admin/settings?tab=conference`
- [x] **05** — `settings/submissions.mdx` — *Submissions tab* (validation + extraction) — `/admin/settings?tab=submissions`
- [x] **06** — `settings/submission-types.mdx` — *Submission Types — three accordions* — `/admin/settings?tab=types`
- [x] **07** — `settings/tracks.mdx` — *Tracks tab* (list + Create) — `/admin/settings?tab=tracks`
- [x] **08** — `planner/setup.mdx` — *Program tab* (Planner + Rooms + Program Tracks) — `/admin/settings?tab=program`
- [x] **09** — `settings/email-templates.mdx` — *Email Templates tab* (footer + list) — `/admin/settings?tab=emails`
- [x] **10** — `settings/branding.mdx` — *Branding tab* — `/admin/settings?tab=branding`
- [x] **11** — `settings/fee.mdx` — *Fee tab* (types + instructions) — `/admin/settings?tab=fee`
- [x] **12** — `settings/reminders.mdx` — *Reminders tab* (3 groups) — `/admin/settings?tab=reminders`
- [x] **13** — `settings/survey.mdx` — *Survey tab* (question list) — `/admin/settings?tab=survey`
- [x] **14** — `settings/terms-of-service.mdx` — *Terms of Service tab, **Preview** mode* — `/admin/settings?tab=tos`
- [x] **15** — `settings/invitations.mdx` — *Invitations tab* (validity hours) — `/admin/settings?tab=invitations`
- [x] **38** — `settings/conference.mdx` — *Exhibitors section on the Conference tab* (3 toggles) — `/admin/settings?tab=conference` *(needs exhibitors enabled — done in seed)*
- [x] **40** — `settings/survey.mdx` — *Import template dialog* — `/admin/settings?tab=survey` → **Import template**

*(`settings/roles-and-permissions.mdx` has no screenshot — tables only.)*

---

## Part 2 — Managing the conference

- [x] **16** — `managing/quick-start.mdx` — *Admin dashboard* (whole) — `/admin/dashboard`
- [x] **17** — `managing/dashboard.mdx` — *Dashboard* — metrics + sparklines + system health — `/admin/dashboard`
- [x] **18** — `managing/submissions.mdx` — *Submissions list* (table + toolbar) — `/admin/submissions`
- [x] **19** — `managing/submissions.mdx` — *Submission detail — Content tab with version selector* — `/admin/submissions/<id>`
- [x] **20** — `managing/reviews.mdx` — *Assign reviewer dialog* (open) — `/admin/submissions/<id>` → Assign reviewer
- [x] **21** — `managing/users.mdx` — *Users list* (columns + survey columns) — `/admin/users`
- [x] **22** — `managing/users.mdx` — *User detail* (header + ⋯ actions, contact/account/fee cards) — `/admin/users/<id>`
- [x] **23** — `managing/users.mdx` — *User submissions panel* — `/admin/users/<id>`
- [x] **24** — `managing/invitations.mdx` — *Invitations list* — `/admin/invitations`
- [x] **25** — `planner/overview.mdx` — *Program Planner calendar* (rooms × days) — `/admin/program-planner`
- [x] **26** — `managing/extraction.mdx` — *Extraction status on a submission* (DOCX) — `/admin/submissions/<id>`
- [x] **27** — `managing/activity-log.mdx` — *Activity history on a submission* — `/admin/submissions/<id>` → history section
- [x] **33** — `managing/bulk-email.mdx` — *Email campaigns composer* (recipients, format, body, placeholders) — `/admin/bulk-email/<id>`
- [x] **34** — `managing/submissions.mdx` — *Version compare — side-by-side, highlighted diff* — `/admin/submissions/<id>/compare?view=split`
- [x] **35** — `managing/exhibitors.mdx` — *Exhibitors list* — `/admin/exhibitors`
- [x] **36** — `managing/exhibitors.mdx` — *Exhibitor detail* (Company/Package, Contact, Decision) — `/admin/exhibitors/<id>`
- [x] **37** — `managing/exhibitors.mdx` — *Approve dialog with reason* — `/admin/exhibitors/<id>` → **Approve**
- [x] **39** — `managing/reviews.mdx` — *Reviewer Compare versions page, side-by-side* — `/reviews/<assignmentId>/compare?view=split` *(reviewer-authenticated)*
- [x] **41** — `managing/bulk-email.mdx` — *Recipient selection — rows ticked, Bulk actions → Send email* — `/admin/users`
- [x] **42** — `managing/exhibitors.mdx` — *Registration account-type choice* (Participant / Author vs Exhibitor) — `/register` *(guest context; needs exhibitors enabled)*
- [x] **43** — `managing/documents.mdx` — *Documents → Templates tab* (templates + placeholder chips) — `/admin/documents`
- [x] **44** — `managing/documents.mdx` — *Add-document dialog* (resolution preview, missing field) — `/admin/users/:id` → **Add document**
- [x] **45** — `managing/documents.mdx` — *Generated documents tab* (status filters + table) — `/admin/documents?tab=generated`
- [x] **46** — `managing/documents.mdx` — *Bulk generate dialog* (review: resolvable vs skipped) — `/admin/users` → Bulk actions → Generate document
- [x] **47** — `managing/documents.mdx` — *Participant My Documents* — `/documents` *(user-authenticated context)*

---

## Part 3 — Program Planner  (`/admin/program-planner`)

- [x] **28** — `planner/manual-scheduling.mdx` — *Session editor* (chairs + presentations) — open a session → right panel
- [x] **29** — `planner/manual-scheduling.mdx` — *Reading mode* (full-screen submission reader) — sidebar → **Read**
- [x] **30** — `planner/autoplanner.mdx` — *Auto-plan proposal preview* (session cards + stats) — `/admin/program-planner/auto-plan` → **Generate proposal**
- [x] **31** — `planner/publishing.mdx` — *Publish dialog* (pre-publish issue checks) — header **Publish**
- [ ] **54** — `planner/publishing.mdx` — *Co-author double-booked check* (publish dialog, co-author across parallel sessions) — header **Publish**
- [x] **32** — `planner/publishing.mdx` — *Public program* (parallel sessions, chairs, breaks) — `/program`
- [x] **58** — `planner/manual-scheduling.mdx` — *Cancelled presentation in the session editor* (⊘ toggle, struck-through row) — open a session → cancel a talk
- [x] **52** — `planner/manual-scheduling.mdx` — *New event in the create dialog* — `/admin/program-planner` → **New** → **Event**
- [x] **53** — `planner/manual-scheduling.mdx` — *Event as a featured card on the public program* — `/program`

---

## Part 6 — Camera-ready, planner events, attachments, survey

- [x] **48** — `managing/bulk-email.mdx` — *Attachments panel with a file attached* — `/admin/bulk-email/<id>` *(DRAFT campaign only)*
- [x] **49** — `planner/setup.mdx` — *Settings › Program › Appearance theme selector* — `/admin/settings?tab=program`
- [x] **50** — `planner/publishing.mdx` — *Presentation preview dialog with favourite toggle* — `/program` → click a talk
- [x] **51** — `planner/publishing.mdx` — *User menu with the Notifications toggle* — `/program` → user menu *(needs VAPID env vars)*
- [x] **54** — `managing/submissions.mdx` — *Camera-ready card on the submission detail page* — `/admin/submissions/<id>`
- [x] **55** — `managing/submissions.mdx` — *Bulk camera-ready upload — skip report toast* — `/admin/submissions` → **Upload camera-ready**
- [x] **56** — `managing/users.mdx` — *On-behalf submission form* — `/admin/users/<id>` → **Add submission**
- [x] **57** — `managing/users.mdx` — *Edit survey answers dialog* — `/admin/users/<id>` → Survey Responses → **Edit**
- [ ] **59** — `managing/ai-assistant.mdx` — *Connect an AI assistant dialog* (server URL, register command, authorized applications) — user menu → **Connect AI assistant**
- [ ] **60** — `managing/ai-assistant.mdx` — *Authorization screen* (application name, verified origin, requested access) — `/consent` during an assistant's OAuth flow

---

## Notes on the tricky ones
- **03 (installer):** only reachable before the system is installed; capture on a fresh DB / e2e instance.
- **14 (ToS):** switch to the **Preview** tab, not Edit.
- **19, 20, 26, 27:** open a specific submission (version selector / open dialog / DOCX upload / history section).
- **22, 23:** open a specific user; **22** shows the header + info cards (actions live in the **⋯** menu), **23** the submissions panel.
- **30 (autoplan):** needs the LLM + clustering services reachable (`LLM_API_URL`, `PLANNER_API_URL`); the test skips itself if either is down. Captures the *result preview*, not the transient stage screen.
- **32 (public program):** publishes the schedule via the `setSchedulePublished(true)` helper, captures `/program`, then restores draft.
- **35–38 (exhibitors):** the seed enables the exhibitor feature (`SUBMISSION_TYPE_EXHIBITOR.isActive`) and creates a few applications; **37** opens the Approve dialog but does **not** confirm (the exhibitor stays pending). **38** element-shoots the *Exhibitors* card on the Conference tab.
- **39 (reviewer compare):** runs in a **reviewer-authenticated** context (`e2e/.auth/reviewer-<worker>.json`), not admin; the seed gives the reviewer an assignment on the two-version paper.
- **01 (login) & 42 (registration):** guest-only screens — the manual context must pass `storageState: { cookies: [], origins: [] }`, otherwise the project's admin session redirects `/login` and `/register` to the app.
- **48 (attachments):** the `Attachments` panel only renders interactively while the campaign is `DRAFT`.
- **49 (program theme):** captures the **Appearance** section only (not the whole tab); doesn't change the selected theme.
- **50, 51, 53 (public program — preview, notifications, event card):** all toggle `setSchedulePublished(true)` then restore `false` afterwards. **51** needs `VITE_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` set, otherwise the Notifications item is hidden.
- **55 (bulk camera-ready report):** the skip report is a toast, not an in-dialog panel — the dialog auto-closes on success; the shot captures the page right after the toast appears.
- **59, 60 (AI assistant):** need the server started with `MCP_ENABLED=true`; **60** requires an `oauthClient` row and a signed authorize redirect, so capture it from the flow `e2e/admin/mcp.spec.ts` drives rather than by visiting `/consent` directly.
