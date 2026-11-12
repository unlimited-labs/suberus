# Suberus

Abstract management system for scientific conferences: submission, review, scheduling and the conference program.

## Language

### Printed program

**Printed program**:
The conference schedule as an offline document for print or design handoff (Word or InDesign), made of the Parts the admin selects. It contains no abstract texts. The Excel export carries the same data as a workbook, without the Title & contents Part or the logo.
_Avoid_: Book of abstracts, program book, PDF program

**Part**:
One of the main divisions of the Printed program: Title & contents, Program at a glance, Detailed program, Author index. The admin selects which Parts to include; at least Program at a glance or Detailed program must be included.
_Avoid_: Section (in the code a section is a page-layout unit; one Part can span several), chapter, component

**Program at a glance**:
The Part of the Printed program that gives each day at a glance: by default a grid of time against rooms with one cell per session, break or event; the Glance layout can turn it into a list.
_Avoid_: Overview, timetable, grid view

**Glance layout**:
The arrangement chosen for one day's Program at a glance: rooms as columns, a facing-page spread, transposed (rooms as rows), or a per-time-block list.
_Avoid_: Grid mode, view

**Detailed program**:
The part of the Printed program that lists every session with its chairs and slots, day by day.
_Avoid_: Full program, session list

**Author index**:
The alphabetical list of authors and session chairs. Each entry points to the Session codes where the person appears, with presenting appearances marked.
_Avoid_: Name index, participant list

**Session code**:
A short label such as `2B3` (day 2 of the conference counted from its start date, room B, third session in that room that day). Rooms are lettered in planner order, skipping `X`, which marks sessions without a room; after `Z` come `AA`, `AB`, … It is derived when the Printed program is produced and links the grid, the Detailed program and the Author index.
_Avoid_: Session ID, session number

### Registration

**Billing details**:
What a participant gives so the organizer can issue an invoice: either one free-text block or a set of separate fields (organization name, address, VAT ID), as the admin chooses. The participant's Country is shared with them, not repeated.
_Avoid_: Address (the old field name), invoice data, payer details

**VAT ID**:
The tax identification number of the organization being invoiced, carrying its country prefix (e.g. `PL1234567890`). Shown only when the admin enables it, in either form of Billing details.
_Avoid_: NIP, Tax ID, TIN (an admin may relabel the field, but the concept keeps this name)

**Verified** (VAT ID):
A VAT ID that a public tax registry confirmed at a recorded moment. Advisory only: an unverified VAT ID never stops registration.
_Avoid_: Valid (a VAT ID can pass its checksum and still be unverified)

**Incomplete** (Billing details):
A participant needs an invoice (asked for one, or Invoice required is on) but a field the current form requires is empty. Details given under an earlier form setting do not count.
_Avoid_: Missing invoice data, unfinished billing

**Invoice required**:
The admin's choice that every participant must give Billing details; the participant can no longer opt out of an invoice.
_Avoid_: Mandatory billing, force invoice

### Deployment

**Instance**:
One conference's own deployment of Suberus: its app, its database, its file storage and its domain. Instances share nothing that holds conference data.
_Avoid_: Tenant, engine, silnik, site

**Shared service**:
A stateless helper (document conversion, PDF extraction, session clustering) that runs once and serves every Instance. It keeps no conference data between requests.
_Avoid_: Sidecar (they no longer sit beside one Instance), common service

**Interactive work**:
Work on a Shared service whose result a person is waiting for on screen (a redline, an export, an extraction filling a form, an auto-plan). It goes ahead of Background work.
_Avoid_: Sync, realtime, priority job

**Background work**:
Work on a Shared service that nobody is watching (generating and signing documents, preparing version diffs). It may be turned away when the service is busy and retried later.
_Avoid_: Batch job (as a domain word), async
