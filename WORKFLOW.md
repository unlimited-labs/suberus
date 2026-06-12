# Review Workflow System

## Overview

Universal, configurable review workflow supporting multiple submission types (abstracts, papers, posters) with flexible reviewer assignments and decision-making processes.

**Modular Design:**
- System can handle **abstracts only**, **papers only**, or **both simultaneously**
- Each type has independent configuration (reviewers, deadlines, review mode, workflow)
- Separate UI routes and forms per type ("/abstracts", "/papers", "/posters")
- Shared backend model (`Submission`) for code reuse
- Enable/disable types via `isActive` flag in `SubmissionTypeConfig`

**Use Cases:**
- Traditional conference: Abstract-only submission for talk selection
- Journal-style: Paper-only submission with rigorous peer review
- Hybrid conference: Abstracts for presentations + Papers for proceedings

---

## Workflow Diagrams

### 1. Abstract Workflow (1 Reviewer, Reviewer Decides)

```mermaid
stateDiagram-v2
    [*] --> Draft: Author creates
    Draft --> Submitted: Author submits
    Submitted --> UnderReview: Editor assigns reviewer
    Submitted --> Accepted: Editor desk accepts
    Submitted --> Rejected: Editor desk rejects
    Submitted --> Withdrawn: Author withdraws

    UnderReview --> ReviewsComplete: Reviewer submits
    UnderReview --> Withdrawn: Author withdraws

    ReviewsComplete --> Accepted: Reviewer ACCEPT
    ReviewsComplete --> ConditionallyAccepted: Reviewer ACCEPT_WITH_MINOR
    ReviewsComplete --> ReviseRequired: Reviewer REVISE_AND_RESUBMIT
    ReviewsComplete --> Rejected: Reviewer REJECT

    ReviseRequired --> Resubmitted: Author revises
    ReviseRequired --> Withdrawn: Author gives up

    Resubmitted --> UnderReview: Assign reviewer (round++)
    Resubmitted --> Withdrawn: Author withdraws

    ReviewsComplete --> Withdrawn: Author withdraws

    ConditionallyAccepted --> ConditionallyAccepted: Author uploads revised version (no new round)
    ConditionallyAccepted --> Accepted: Editor confirms conditions met

    Accepted --> [*]
    Rejected --> [*]
    Withdrawn --> [*]

    note right of UnderReview
        requiredReviewers: 1
        requiresEditorDecision: false
        Auto-applies reviewer decision
    end note
```

### 2. Paper Workflow (2-3 Reviewers, Editor Decides)

```mermaid
stateDiagram-v2
    [*] --> Draft: Author creates
    Draft --> Submitted: Author submits
    Submitted --> UnderReview: Editor assigns 2-3 reviewers
    Submitted --> Accepted: Editor desk accepts
    Submitted --> Rejected: Editor desk rejects
    Submitted --> Withdrawn: Author withdraws

    UnderReview --> ReviewsComplete: Editor transitions (after all reviews)
    UnderReview --> Withdrawn: Author withdraws

    ReviewsComplete --> AwaitingDecision: Editor transitions
    ReviewsComplete --> Accepted: Editor ACCEPT (shortcut)
    ReviewsComplete --> ConditionallyAccepted: Editor CONDITIONALLY_ACCEPT (shortcut)
    ReviewsComplete --> ReviseRequired: Editor REVISE_AND_RESUBMIT (shortcut)
    ReviewsComplete --> Rejected: Editor REJECT (shortcut)

    AwaitingDecision --> Accepted: Editor ACCEPT
    AwaitingDecision --> ConditionallyAccepted: Editor CONDITIONALLY_ACCEPT
    AwaitingDecision --> ReviseRequired: Editor REVISE_AND_RESUBMIT
    AwaitingDecision --> Rejected: Editor REJECT

    ReviseRequired --> Resubmitted: Author revises
    ReviseRequired --> Withdrawn: Author gives up

    Resubmitted --> UnderReview: Assign reviewers (round++)

    ConditionallyAccepted --> ConditionallyAccepted: Author uploads revised version (no new round)
    ConditionallyAccepted --> Accepted: Editor confirms conditions met

    ReviewsComplete --> Withdrawn: Author withdraws
    AwaitingDecision --> Withdrawn: Author withdraws
    Resubmitted --> Withdrawn: Author withdraws

    Accepted --> [*]
    Rejected --> [*]
    Withdrawn --> [*]

    note right of AwaitingDecision
        requiredReviewers: 2
        requiresEditorDecision: true
        Editor makes final decision
    end note
```

### 3. Review Assignment Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Pending: Editor assigns reviewer

    Pending --> Completed: Reviewer submits review
    Pending --> Overdue: Deadline passed
    Pending --> Cancelled: Editor cancels

    Overdue --> Cancelled: Editor reassigns
    Overdue --> Completed: Reviewer finally submits

    Completed --> [*]
    Cancelled --> [*]

    note right of Pending
        assignedAt timestamp
        deadline +14 days
    end note

    note right of Completed
        Triggers check if all done
    end note
```

### 4. Complete Workflow with All Paths

```mermaid
flowchart TD
    Start([Author Creates Submission]) --> Draft[DRAFT]
    Draft -->|Author submits| Submitted[SUBMITTED]

    Submitted -->|Desk reject| Rejected
    Submitted --> AssignType{Submission Type?}

    AssignType -->|Abstract 1 reviewer| Assign1[Editor assigns 1 reviewer]
    AssignType -->|Poster 1 reviewer| Assign1
    AssignType -->|Paper 2-3 reviewers| Assign2[Editor assigns 2-3 reviewers]

    Assign1 --> UnderReview[UNDER_REVIEW]
    Assign2 --> UnderReview

    UnderReview --> ReviewWait{All reviews complete?}
    ReviewWait -->|No| UnderReview
    ReviewWait -->|Yes| ReviewsComplete[REVIEWS_COMPLETE]

    ReviewsComplete --> EditorCheck{Requires Editor Decision?}

    EditorCheck -->|No (Abstract/Poster)| ReviewerDec{Reviewer Decision}
    EditorCheck -->|Yes (Paper)| Awaiting[AWAITING_DECISION]

    Awaiting --> EditorDec{Editor Decision}

    ReviewerDec -->|ACCEPT| Accepted[ACCEPTED]
    ReviewerDec -->|ACCEPT_WITH_MINOR| CondAccepted[CONDITIONALLY_ACCEPTED]
    ReviewerDec -->|REVISE_AND_RESUBMIT| Revise[REVISE_REQUIRED]
    ReviewerDec -->|REJECT| Rejected[REJECTED]

    EditorDec -->|ACCEPT| Accepted
    EditorDec -->|CONDITIONALLY_ACCEPT| CondAccepted
    EditorDec -->|REVISE_AND_RESUBMIT| Revise
    EditorDec -->|REJECT| Rejected

    Revise -->|Author revises| Resubmitted[RESUBMITTED]
    Resubmitted -->|Round++, Editor assigns reviewers| UnderReview

    Revise -->|Author gives up| Withdrawn[WITHDRAWN]
    Draft -->|Author withdraws| Withdrawn
    Submitted -->|Author withdraws| Withdrawn
    UnderReview -->|Author withdraws| Withdrawn
    ReviewsComplete -->|Author withdraws| Withdrawn
    Awaiting -->|Author withdraws| Withdrawn
    Resubmitted -->|Author withdraws| Withdrawn

    Accepted --> End([End])
    CondAccepted -->|Author uploads revised version, no new round| CondAccepted
    CondAccepted -->|Editor confirms conditions met| Accepted
    CondAccepted --> End
    Rejected --> End
    Withdrawn --> End

    style Accepted fill:#90EE90
    style CondAccepted fill:#FFD700
    style Rejected fill:#FF6B6B
    style Withdrawn fill:#D3D3D3
    style Revise fill:#87CEEB
```

### 5. Multi-Round Review Process

```mermaid
sequenceDiagram
    participant Author
    participant System
    participant Editor
    participant Reviewer1
    participant Reviewer2

    Note over System: Round 1
    Author->>System: Submit (v1)
    System->>System: status = SUBMITTED

    Editor->>System: Assign reviewers
    System->>Reviewer1: Assignment (PENDING)
    System->>Reviewer2: Assignment (PENDING)
    System->>System: status = UNDER_REVIEW

    Reviewer1->>System: Submit review (REVISE)
    System->>System: assignment1 = COMPLETED

    Reviewer2->>System: Submit review (REVISE)
    System->>System: assignment2 = COMPLETED
    Note right of System: All reviews complete → auto-transition
    System->>System: status = REVIEWS_COMPLETE
    System->>System: status = AWAITING_DECISION
    Editor->>System: Decision: REVISE_AND_RESUBMIT
    System->>System: status = REVISE_REQUIRED

    System->>Author: Notify: Revisions needed

    Note over System: Round 2
    Author->>System: Resubmit (v2)
    System->>System: status = RESUBMITTED
    System->>System: currentRound = 2

    Editor->>System: Reassign reviewers
    System->>Reviewer1: Assignment (round=2)
    System->>Reviewer2: Assignment (round=2)
    System->>System: status = UNDER_REVIEW

    Reviewer1->>System: Submit review (ACCEPT)
    Reviewer2->>System: Submit review (ACCEPT)
    Note right of System: Editor manually transitions

    Editor->>System: Transition to REVIEWS_COMPLETE
    System->>System: status = REVIEWS_COMPLETE
    Editor->>System: Transition to AWAITING_DECISION
    System->>System: status = AWAITING_DECISION

    Editor->>System: Decision: ACCEPT
    System->>System: status = ACCEPTED

    System->>Author: Notify: Accepted!
```

---

## Core Principles

### 1. Submission Types Are Distinct
Each submission type (ABSTRACT, FULL_PAPER, POSTER) has independent configuration. No shared behavior assumed between types.

EXHIBITOR is a special non-reviewed submission type used only for exhibitor company presentations — see [Exhibitor Flow](#exhibitor-flow).

### 2. Modular Activation - Flexible Deployment
Conference can enable submission types independently via `isActive` flag:
- **Abstract only** - Traditional conference abstracts
- **Paper only** - Journal-style full papers
- **Both Abstract + Paper** - Hybrid conference (e.g., abstract for talk selection, paper for proceedings)

Each type has separate UI:
- Separate navigation links ("/abstracts", "/papers", "/posters")
- Separate submission forms
- Separate listing pages
- Independent workflows

Shared backend (`Submission` model) enables code reuse while maintaining UI/UX separation.

### 3. Configuration Drives Behavior
All workflow logic reads from `SubmissionTypeConfig` (defined in `src/lib/settings/types.ts`, stored as JSON in the `app_settings` table via `AppSetting` model). Code doesn't hardcode rules like "abstracts need 1 reviewer" - config determines this.

### 4. Editor as Universal Reviewer
Editors (role=EDITOR) can:
- View all submissions regardless of assignment
- See all reviews including private notes
- Make decisions on any submission
- Override workflow if needed
- Assign/reassign reviewers at any time

---

## Submission Status Definitions

### Active States

| Status | Description | Who Can Transition |
|--------|-------------|-------------------|
| `DRAFT` | Author preparing submission | Author |
| `SUBMITTED` | Waiting for reviewer assignment | Editor |
| `UNDER_REVIEW` | Reviewers assigned, reviewing | System (when all reviews done) |
| `REVIEWS_COMPLETE` | All reviews submitted | System (auto) |
| `AWAITING_DECISION` | Editor needs to decide (papers) | Editor |
| `REVISE_REQUIRED` | Author must revise | Author |
| `RESUBMITTED` | Author resubmitted revision | Editor |

### Terminal States

| Status | Description | Editor Override? |
|--------|-------------|-----------------|
| `ACCEPTED` | Final acceptance ✅ | ✅ Can reopen |
| `CONDITIONALLY_ACCEPTED` | Accepted with minor conditions — author can upload a revised version; editor promotes to ACCEPTED | ✅ Can reopen or promote |
| `REJECTED` | Final rejection ❌ | ✅ Can reopen |
| `WITHDRAWN` | Author withdrew | ❌ Truly final |

---

## State Transition Rules

### From DRAFT
- → `SUBMITTED` (author submits)
- Author can edit content freely while in DRAFT
- No versioning in DRAFT state

### From SUBMITTED
- → `UNDER_REVIEW` (when reviewer assigned)
- → `ACCEPTED` (desk acceptance by Editor/Admin - no review needed)
- → `REJECTED` (desk rejection by Editor/Admin - no review needed)
- → `WITHDRAWN` (author withdraws)

### From UNDER_REVIEW
- → `REVIEWS_COMPLETE` (all reviews done)
- → `WITHDRAWN` (author withdraws)
- → `UNDER_REVIEW` (reassign reviewer - stays same state)

### From REVIEWS_COMPLETE
**If requiresEditorDecision=false** (Abstracts/Posters):
- Auto-applies reviewer decision immediately
- Reviewer decides ACCEPT → `ACCEPTED`
- Reviewer decides REJECT → `REJECTED`
- Reviewer decides REVISE_AND_RESUBMIT → `REVISE_REQUIRED`
- Reviewer decides ACCEPT_WITH_MINOR_REVISIONS → `CONDITIONALLY_ACCEPTED`

**If requiresEditorDecision=true** (Papers):
- → `AWAITING_DECISION` (editor transitions manually)
- Editor can also decide directly from REVIEWS_COMPLETE (shortcut, skips AWAITING_DECISION):
  - EDITOR_ACCEPT → `ACCEPTED`
  - EDITOR_CONDITIONAL → `CONDITIONALLY_ACCEPTED`
  - EDITOR_REVISE → `REVISE_REQUIRED`
  - EDITOR_REJECT → `REJECTED`

### From AWAITING_DECISION
Editor makes final decision:
- ACCEPT → `ACCEPTED`
- REJECT → `REJECTED`
- REVISE_AND_RESUBMIT → `REVISE_REQUIRED`
- CONDITIONALLY_ACCEPT → `CONDITIONALLY_ACCEPTED`

### From REVISE_REQUIRED
- → `RESUBMITTED` (author resubmits)
- → `WITHDRAWN` (author gives up)

### From RESUBMITTED
- → `UNDER_REVIEW` (assign reviewers for new round)
- Increment `currentRound`

### From CONDITIONALLY_ACCEPTED
- → `CONDITIONALLY_ACCEPTED` (author uploads a revised version — camera-ready / minor revisions)
  - Creates a new `SubmissionVersion`; status, `currentRound`, and reviewer assignments are unchanged
  - Does **NOT** start a new review round (unlike REVISE_REQUIRED → RESUBMITTED)
  - Author may upload multiple times; editor reviews the latest version
  - Notifies caretaker editor (`REVISION_RECEIVED`)
- → `ACCEPTED` (editor confirms minor conditions met)
- → `AWAITING_DECISION` (editor override — reopens decision)
- Promotion to ACCEPTED and override are EDITOR/ADMIN only and require reasoning (audit trail)

### From ACCEPTED / REJECTED
- → `AWAITING_DECISION` (editor override — reopens decision)
- Only EDITOR/ADMIN can trigger
- Requires reasoning (audit trail)

### Withdrawal
Author can withdraw from **any non-terminal state**: DRAFT, SUBMITTED, UNDER_REVIEW, REVIEWS_COMPLETE, AWAITING_DECISION, REVISE_REQUIRED, RESUBMITTED.
- → `WITHDRAWN` (author withdraws)
- No permission from editor needed

### Terminal States
`WITHDRAWN` - No transitions out (truly final)

`ACCEPTED`, `CONDITIONALLY_ACCEPTED`, `REJECTED` - Editor can override back to `AWAITING_DECISION`

---

## Review Assignment

### Single Reviewer (Abstracts)

```typescript
Config: requiredReviewers=1

Flow:
1. Editor assigns reviewer(s)
2. Creates ReviewAssignment (status=PENDING)
3. Submission status → UNDER_REVIEW
4. Reviewer submits review
5. Assignment status → COMPLETED
6. Submission status → REVIEWS_COMPLETE
7. Auto-apply decision (no editor needed)
```

### Multiple Reviewers (Papers)

```typescript
Config: requiredReviewers=2

Flow:
1. Editor assigns reviewers (minimum 2)
2. Creates multiple ReviewAssignment records
3. Submission status → UNDER_REVIEW
4. Reviewers work independently
5. Each submits review → their assignment COMPLETED
6. When all assignments COMPLETED → REVIEWS_COMPLETE
7. Submission status → AWAITING_DECISION
8. Editor reviews all recommendations
9. Editor makes final decision → terminal state (ACCEPTED/REJECTED/etc.)
```

### Assignment Status Progression

```
PENDING → COMPLETED
   ↓          ↑
OVERDUE ──────┘
   ↓
CANCELLED
```

### Reviewer Reassignment

```
Scenario: Reviewer doesn't respond within deadline

1. Assignment status → OVERDUE (auto-calculated)
2. Editor cancels assignment
3. Assignment status → CANCELLED, cancelledAt set
4. Editor assigns new reviewer
5. New ReviewAssignment created (same round)
6. Old review (if exists) archived
7. Submission continues in UNDER_REVIEW
```

### Round Tracking

```
Round 1: Initial submission
- All reviews have round=1
- All assignments have round=1

Author revises → RESUBMITTED
- currentRound increments to 2

Round 2: Re-review
- New assignments created with round=2
- New reviews have round=2
- Old reviews (round=1) remain for history
```

---

## Review Scoring

### When Enabled (enableScoring=true)

```typescript
Config: {
  enableScoring: true,
  scoringCriteria: [
    { name: "Originality", description: "Contribution to the field" },
    { name: "Clarity", description: "Writing quality and structure" },
    { name: "Significance", description: "Importance and impact" },
    { name: "Methodology", description: "Research design and execution" },
  ]
}

Review form shows (dynamic from scoringCriteria):
- Each criterion: 1-5 score (compact row with label + description)
- Scale legend shown once: 1=Poor ... 5=Excellent
- Confidence Level: 1-5 (only if enableConfidenceLevel=true in config)
- Comments: text
- Private Notes: text (editor only)
- Decision: ACCEPT/REJECT/REVISE/ACCEPT_WITH_MINOR

Database storage:
- Review.scores: Json? — stores Record<string, number>, e.g. {"Originality": 4, "Clarity": 5}
- Admin can add/remove criteria with name + description per submission type

Average score calculation:
allScores = Object.values(review.scores)
averageScore = sum(allScores) / allScores.length
```

### When Disabled (enableScoring=false)

```typescript
Review form shows:
- Comments: text
- Private Notes: text (editor only)
- Decision: ACCEPT/REJECT/REVISE/ACCEPT_WITH_MINOR

No scoring fields shown
Review.scores remains NULL
```

---

## Decision Logic

### Abstract (Reviewer Decides)

```typescript
Config: requiresEditorDecision = false

When review submitted:
  if (reviewDecision === 'ACCEPT') {
    submissionStatus = 'ACCEPTED'
  } else if (reviewDecision === 'ACCEPT_WITH_MINOR_REVISIONS') {
    submissionStatus = 'CONDITIONALLY_ACCEPTED'
  } else if (reviewDecision === 'REVISE_AND_RESUBMIT') {
    submissionStatus = 'REVISE_REQUIRED'
  } else if (reviewDecision === 'REJECT') {
    submissionStatus = 'REJECTED'
  }
```

### Paper (Editor Decides)

```typescript
Config: requiresEditorDecision = true

When all reviews submitted:
  submissionStatus = 'REVIEWS_COMPLETE'

  if (!config.requiresEditorDecision) {
    // Auto-apply reviewer decision (abstracts/posters)
    // → ACCEPTED / REJECTED / REVISE_REQUIRED / CONDITIONALLY_ACCEPTED
    applyReviewerDecision(review.decision)
  } else {
    submissionStatus = 'AWAITING_DECISION'
  }

  // Editor can also decide directly from REVIEWS_COMPLETE (shortcut)

  // Editor reviews:
  // Review 1: ACCEPT (score: 4.5/5)
  // Review 2: REVISE (score: 3.0/5)
  // Review 3: ACCEPT (score: 4.0/5)

  // Editor decides: ACCEPT (majority recommends)

When editor submits decision:
  createEditorDecision({
    decision: 'ACCEPT',
    reasoning: '2/3 recommend acceptance',
    letterToAuthor: 'We are pleased to accept...',
    basedOnReviews: [review1.id, review2.id, review3.id]
  })

  // Direct transition to terminal state
  if (editorDecision === 'ACCEPT') {
    submissionStatus = 'ACCEPTED'
  } else if (editorDecision === 'CONDITIONALLY_ACCEPT') {
    submissionStatus = 'CONDITIONALLY_ACCEPTED'
  } else if (editorDecision === 'REVISE_AND_RESUBMIT') {
    submissionStatus = 'REVISE_REQUIRED'
  } else if (editorDecision === 'REJECT') {
    submissionStatus = 'REJECTED'
  }
```

### Editor Override

```typescript
Scenario: Config says requiresEditorDecision=false but editor wants to override

Example: Abstract with bad reviewer decision
- Reviewer recommends REJECT
- Auto-transition to REJECTED would happen
- Editor sees review is poor quality
- Editor manually creates EditorDecision
- Editor decision: ACCEPT (override)
- Reasoning: "Reviewer misunderstood methodology"

System allows this for EDITOR and ADMIN roles
```

---

## Round Management

### Round Increment

```typescript
When author resubmits after REVISE_REQUIRED:
  1. Create new SubmissionVersion
     - version = currentVersion + 1
     - content = revised content
     - comment = "Addressed reviewer feedback"

  2. Increment round
     - submission.currentRound++

  3. Update status
     - status = 'RESUBMITTED'

  4. Auto-reassign reviewers from previous round
     - System copies non-cancelled ReviewAssignments from previous round
     - New ReviewAssignment records with round = currentRound, status = PENDING
     - Each reviewer receives REVIEWER_ASSIGNED notification
     - If assignedCount >= requiredReviewers → auto-transition to UNDER_REVIEW

  5. Editor can modify assignments
     - Cancel auto-assigned reviewers
     - Assign different reviewers
     - Previous-round reviewers are available for selection in the UI

  6. Continue workflow
     - status = 'UNDER_REVIEW'
```

---

## Deadlines

### Submission Deadline

```typescript
Config: SUBMISSION_DEADLINE (date, optional) + SUBMISSIONS_LOCKED (boolean)

When an author creates a new submission (draft or final):
- If SUBMISSIONS_LOCKED is on -> blocked
- Else if SUBMISSION_DEADLINE is set and has passed -> blocked
- Otherwise allowed

Per-user override: User.allowLateSubmission (default false)
- When true, that user bypasses BOTH the deadline and SUBMISSIONS_LOCKED
- Set by admins/editors via the user detail page; recorded in the activity log
  (USER_TOGGLED_LATE_SUBMISSION)
- Only affects new-submission creation (edits/resubmits are not deadline-guarded)
```

### Review Deadlines

```typescript
Config: reviewDeadline = 14 (days) // Default

When reviewer assigned:
- Editor can specify custom deadline (optional)
- If not specified: ReviewAssignment.deadline = assignedAt + config.reviewDeadline days
- If specified: ReviewAssignment.deadline = customDeadline
- System can send reminder emails at deadline - 2 days
- System auto-marks OVERDUE at deadline + 1 day
- Editor sees overdue assignments highlighted

Example assignment with custom deadline:
createReviewAssignment({
  submissionId,
  reviewerId,
  deadline: new Date('2024-02-15') // Custom deadline
})

Example assignment with default deadline:
createReviewAssignment({
  submissionId,
  reviewerId,
  deadline: null // Uses config.reviewDeadline (14 days)
})
```

### No Auto-Actions

```typescript
Assumption: System never auto-cancels or auto-completes reviews

When overdue:
- Status → OVERDUE (visual indicator only)
- Editor must manually intervene
- Editor can: cancel assignment, contact reviewer
```

---

## Review Anonymity

Review mode is configurable per submission type: **OPEN**, **SINGLE_BLIND**, **DOUBLE_BLIND**

### OPEN Review

```typescript
Author visibility:
- ✅ See reviewer identities
- ✅ See all review comments and scores
- ✅ Know who wrote which review

Reviewer visibility:
- ✅ See author names and affiliations
- ✅ See submission metadata
- ✅ (Optional) See other reviews on same submission

Use case: Workshop submissions, collaborative reviews
```

### SINGLE_BLIND Review

```typescript
Author visibility:
- ❌ CANNOT see reviewer identities (hidden)
- ✅ See review comments and scores (anonymized)
- ❌ Cannot identify who wrote which review

Reviewer visibility:
- ✅ See author names and affiliations
- ✅ See full submission details
- ✅ (Optional) See other reviews on same submission

Use case: Conference abstracts, most academic reviews
```

### DOUBLE_BLIND Review

```typescript
Author visibility:
- ❌ CANNOT see reviewer identities (hidden)
- ✅ See review comments and scores (anonymized)
- ❌ Cannot identify who wrote which review

Reviewer visibility:
- ❌ CANNOT see author names (removed/anonymized)
- ❌ CANNOT see author affiliations
- ✅ See submission title and content only
- ⚠️  Authors must remove identifying info from content

Use case: High-stakes papers, bias-sensitive reviews
```

### Editor and Admin View

```typescript
Editor/Admin ALWAYS see:
- ✅ All submissions (regardless of review mode)
- ✅ All reviews with full details
- ✅ All reviewer identities
- ✅ All author identities and affiliations
- ✅ Private notes and reasoning
- ✅ Complete audit trail

Role: Full transparency for workflow management and conflict resolution
```

---

## Version Tracking

### New Version on Resubmission

```typescript
When author resubmits after REVISE_REQUIRED:

1. Create new SubmissionVersion
   - version = maxVersion + 1
   - title = updated title
   - content = updated content
   - comment = "Addressed reviewer feedback on methodology"

2. Update Submission.currentVersionId

3. New reviews reference new version
   - Review.versionId = newVersion.id

4. Old reviews reference old version
   - Review.versionId = oldVersion.id

History preserved:
- Round 1 reviews → version 1
- Round 2 reviews → version 2
```

### Version Not Required

```typescript
Assumption: Minor edits don't create new version

- Author can edit DRAFT without versioning
- Only RESUBMITTED creates new version
- Initial submission = version 1
```

---

## Audit Trail

All system events are logged in `ActivityLog` with a granular `ActivityType` enum:
- **User events:** registration, email verification, profile updates, role changes, activation/deactivation, deletion
- **Submission events:** creation, draft submission, status transitions (from/to status, round, event, reason), withdrawal, resubmission, track changes
- **Review events:** assignment, submission, cancellation, overdue marking
- **Decision events:** editor decisions, desk rejections, desk acceptances, decision overrides
- **Invitation events:** creation, usage, cancellation
- **Admin events:** fee paid/unpaid marking

Each entry includes: event type, target user/submission (optional), performer (or null for system actions), typed JSON detail, and timestamp.

**Immutable:** Activity records are never deleted or modified — required for compliance and dispute resolution.

---

## Permissions

### Role-Based Access

| Action | Author | Reviewer | Editor | Admin | Exhibitor |
|--------|--------|----------|--------|-------|-----------|
| Create submission | ✅ | ✅ | ✅ | ✅ | ❌ |
| View own submissions | ✅ | ✅ | ✅ | ✅ | ❌ |
| Be assigned as reviewer | ❌ | ✅ | ✅ | ✅ | ❌ |
| View assigned submissions | ❌ | ✅ | ✅ | ✅ | ❌ |
| View all submissions | ❌ | ❌ | ✅ | ✅ | ❌ |
| Assign reviewers | ❌ | ❌ | ✅ | ✅ | ❌ |
| Submit review | ❌ | ✅ | ✅ | ✅ | ❌ |
| View all reviews | ❌ | ❌ | ✅ | ✅ | ❌ |
| View private notes | ❌ | ❌ | ✅ | ✅ | ❌ |
| Make editor decision | ❌ | ❌ | ✅ | ✅ | ❌ |
| View reviewer identity | 🔀 | ❌ | ✅ | ✅ | ❌ |
| View author identity | 🔀 | 🔀 | ✅ | ✅ | ❌ |
| Resubmit revision | ✅ (own) | ✅ (own) | ✅ (own) | ✅ (own) | ❌ |
| Create/edit own exhibitor application | ❌ | ❌ | ❌ | ❌ | ✅ |
| View all exhibitor applications | ❌ | ❌ | ✅ | ✅ | ❌ |
| Decide exhibitor applications | ❌ | ❌ | ✅ | ✅ | ❌ |

**Legend:**
- ✅ Always allowed
- ❌ Never allowed
- 🔀 Depends on review mode configuration

**Review Mode Impact:**

| View Permission | OPEN | SINGLE_BLIND | DOUBLE_BLIND |
|----------------|------|--------------|--------------|
| Author sees reviewer identity | ✅ | ❌ | ❌ |
| Reviewer sees author identity | ✅ | ✅ | ❌ |
| Editor/Admin see all identities | ✅ | ✅ | ✅ |

**Notes:**
- All users except EXHIBITOR can create submissions and view their own regardless of role
- Editor/Admin can be assigned as reviewers like regular Reviewers
- Editor/Admin ALWAYS see all identities (authors + reviewers) regardless of review mode
- Review mode is configured per submission type in `SubmissionTypeConfig`
- EXHIBITOR users manage their company presentation only through the exhibitor panel: they have no Submissions/Reviews navigation, and `/` and `/submissions` redirect to `/exhibitor`. The EXHIBITOR role is assigned only by the exhibitor signup flow — it cannot be assigned or removed manually (single and bulk role changes block EXHIBITOR targets).

---

## Configuration Examples

### Abstract Configuration

```typescript
{
  type: 'ABSTRACT',
  includeInPlanner: true, // accepted abstracts appear in the program planner
  requiredReviewers: 1,
  requiresEditorDecision: false,

  reviewDeadline: 14, // days

  enableScoring: false,
  scoringCriteria: [],
  reviewMode: 'SINGLE_BLIND' // Authors don't see reviewers
}
```

### Paper Configuration

```typescript
{
  type: 'FULL_PAPER',
  includeInPlanner: false, // default false — papers usually aren't scheduled as talks
  requiredReviewers: 2,
  requiresEditorDecision: true,

  reviewDeadline: 21, // days

  enableScoring: true,
  scoringCriteria: [
    { name: "Originality", description: "Contribution to the field" },
    { name: "Clarity", description: "Writing quality and structure" },
    { name: "Significance", description: "Importance and impact" },
    { name: "Methodology", description: "Research design and execution" },
  ],
  reviewMode: 'DOUBLE_BLIND' // Neither authors nor reviewers see identities
}
```

### Poster Configuration

POSTER uses identical workflow to ABSTRACT (single reviewer, reviewer decides).

```typescript
{
  type: 'POSTER',
  includeInPlanner: true,
  requiredReviewers: 1,
  requiresEditorDecision: false,

  reviewDeadline: 14, // days

  enableScoring: false,
  scoringCriteria: [],
  reviewMode: 'SINGLE_BLIND' // Authors don't see reviewers
}
```

### Exhibitor Configuration

EXHIBITOR never enters review — only these fields are meaningful (review fields are ignored). See [Exhibitor Flow](#exhibitor-flow).

```typescript
{
  type: 'EXHIBITOR',
  isActive: false,                    // master guard: enables the whole exhibitor feature
  includeInPlanner: true,             // approved presentations appear in the planner pool
  allowExhibitorPresentation: false,  // exhibitor form offers an optional company presentation
}
```

**`includeInPlanner`** (all types): accepted submissions of a type are admitted to the program planner (pool, create-session validation, capacity) only when this flag is on. Defaults: ABSTRACT ✅, POSTER ✅, FULL_PAPER ❌, EXHIBITOR ✅. Configured per type in the Submission Types accordion (regular types) or the Conference tab → Exhibitors section (EXHIBITOR).

---

## Exhibitor Flow

Companies can register dedicated **exhibitor** accounts, complete a company application with an **optional company presentation**, and receive a single organizer **approve/reject** decision. Exhibitor presentations are **never peer-reviewed**.

### Configuration (master guard)

Exhibitor behavior is stored in `SubmissionTypeConfig` under `SUBMISSION_TYPE_EXHIBITOR`, but configured in admin Settings → **Conference tab → Exhibitors section** (NOT the Submission Types tab):

| Switch | Config field | Effect |
|--------|--------------|--------|
| **Enable exhibitors** | `isActive` | Master guard. Gates: the "Exhibitor" account-type choice on registration, the admin **Exhibitors** nav entry, and the two sub-switches below (hidden when off). |
| **Include in program planner** | `includeInPlanner` | Approved exhibitor presentations appear in the planner pool. |
| **Allow presentation** | `allowExhibitorPresentation` | The exhibitor panel offers the optional company presentation section. When off, presentation input is ignored server-side. |

### Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Pending: Signup with "Exhibitor" account type
    Pending --> Pending: Save / complete application (first completion stamps appliedAt)
    Pending --> Approved: Organizer approves (reason ≥ 3 chars)
    Pending --> Rejected: Organizer rejects (reason ≥ 3 chars)
    Pending --> Withdrawn: Exhibitor withdraws (panel) or linked presentation withdrawn

    Approved --> [*]
    Rejected --> [*]
    Withdrawn --> [*]

    note right of Pending
        Application editable only while
        PENDING and undecided.
        Completing it with a presentation creates a
        Submission (type EXHIBITOR, status SUBMITTED).
    end note

    note right of Approved
        Linked submission uses ONLY existing
        desk transitions: SUBMITTED → ACCEPTED
        (approve) / REJECTED (reject) /
        WITHDRAWN (withdraw). No new statuses.
    end note
```

### Flow

1. **Signup** — registration shows an **Account type** choice (*Participant / Author* vs *Exhibitor*) only when exhibitors are enabled; **invited users never see it**. Choosing Exhibitor sets role `EXHIBITOR` and creates an empty `Exhibitor` row (status `PENDING`). Only AUTHOR accounts with no submissions can become exhibitors.
2. **Application** (`/exhibitor` panel) — company data (`companyName`, `description`, `website`, `package`) plus the optional presentation (only when **Allow presentation** is on). The presentation uses standard submission authors with **exactly one presenter**. Submitting stamps `appliedAt`; if a presentation was given, a `Submission` (type `EXHIBITOR`, status `SUBMITTED`) is created. Removing the presentation in a pre-decision edit withdraws the orphaned submission. Logged as `EXHIBITOR_APPLIED`.
3. **Decision** (`/admin/exhibitors` list + detail, EDITOR/ADMIN) — single **Approve/Reject** with a required reason (min. 3 characters), available only for **pending, completed** applications. The decision desk-accepts/desk-rejects the linked submission (if any), sets `Exhibitor.status` + `decidedAt`/`decidedBy`, sends `EXHIBITOR_APPROVED`/`EXHIBITOR_REJECTED`, and writes the activity log. The application is **locked after the decision**.
4. **After approval** — the presentation appears in the planner pool (when `includeInPlanner`) and in the submissions export. Exhibitor talks are scheduled **manually**; autoplan stays ABSTRACT-only.
5. **Withdrawal** — the exhibitor can withdraw while `PENDING` (panel; withdraws the linked presentation through the workflow). Withdrawing the linked presentation via the regular submission withdraw also syncs a `PENDING` application to `WITHDRAWN`.

Exhibitors **without a presentation** are fully supported (shown as *No presentation*); the decision works the same. There is no dedicated email when an application without a presentation is completed — `NEW_REGISTRATION_NOTIFY`/`NEW_SUBMISSION_NOTIFY` cover the organizer side (accepted trade-off).

### Isolation Rules

EXHIBITOR submissions never enter the review workflow:

- **No reviewer assignment** — blocked server-side; the admin submission page hides the assign action.
- **No desk accept/reject/override from the admin submission page** — the actions are hidden and the server functions return an error pointing to the exhibitor approval flow (which updates `Exhibitor.status` and notifies the exhibitor).
- **Excluded from bulk status change** — exhibitor submissions are skipped.
- **TODO column shows nothing** — exhibitor entries never need review attention.
- **Autoplan stays ABSTRACT-only** — exhibitor presentations are scheduled manually.

EXHIBITOR users:

- No Submissions/Reviews navigation; `/` and `/submissions` redirect to `/exhibitor`.
- The role is not assignable manually — single and bulk role changes block EXHIBITOR targets; the role is granted only by the signup flow.
- **Fee:** the existing per-user Fee applies, marked paid/unpaid on the user detail page (linked from the exhibitor detail).

---

## Edge Cases

### Desk Rejection

```
Scenario: Editor/Admin rejects submission without review

Use cases:
- Out of scope for conference
- Incomplete submission
- Duplicate submission
- Ethical concerns
- Low quality (obvious issues)

Flow:
1. Author submits → status = SUBMITTED
2. Editor/Admin reviews submission
3. Editor decides: desk reject (no reviewers needed)
4. Editor creates EditorDecision with reasoning
5. Status → REJECTED (direct, skips review process)
6. Author notified with rejection reason

Permissions: Only EDITOR and ADMIN can desk reject
Note: EditorDecision.letterToAuthor should explain rejection reason
```

### Desk Acceptance

```
Scenario: Editor/Admin accepts submission without review

Use cases:
- Invited speaker / keynote
- Editorial decision (pre-approved content)
- Resubmission from trusted source

Flow:
1. Author submits → status = SUBMITTED
2. Editor/Admin reviews submission
3. Editor decides: desk accept (no reviewers needed)
4. Editor creates EditorDecision with reasoning
5. Status → ACCEPTED (direct, skips review process)
6. Author notified with acceptance reason

Permissions: Only EDITOR and ADMIN can desk accept
Note: EditorDecision.letterToAuthor should explain acceptance reason
```

### Auto-Transition After Reviews

```
When all reviews are submitted, system always auto-transitions to REVIEWS_COMPLETE.

- requiresEditorDecision=false: Reviewer decision applied automatically
  (REVIEWS_COMPLETE → terminal state)
- requiresEditorDecision=true: Auto-advances to AWAITING_DECISION,
  editor makes final decision
```

### Reviewer Withdraws Mid-Review

```
Scenario: Reviewer cannot complete review (any reason)

1. Reviewer contacts editor
2. Editor cancels assignment (status=CANCELLED)
3. Editor assigns new reviewer
4. Original partial review archived/ignored
5. New reviewer starts fresh
```

### Editor Changes Mind

```
Scenario: Editor makes decision, then wants to change

Assumption: Allow change before author notification

1. Editor decides REJECT
2. Status → REJECTED
3. Editor clicks "Undo" before notification sent
4. Status → AWAITING_DECISION
5. Editor submits new decision
6. Only latest decision counts
7. History shows both decisions
```

### Bulk Decisions (Editor/Admin)

```
Editor/Admin can apply decisions in bulk to multiple submissions:
- Available targets: ACCEPTED, CONDITIONALLY_ACCEPTED, REVISE_REQUIRED, REJECTED
- Each submission must be in a valid state for the transition
  (REVIEWS_COMPLETE or AWAITING_DECISION)
- Creates EditorDecision record and sends notification per submission
- All transitions go through xstate machine for validation
```

---

## Notifications

Email system uses configurable templates stored in database with simple placeholder substitution (`{{variable}}`).

### Email Templates System

**Model: `EmailTemplate`**
```typescript
{
  eventType: EmailEventType,          // Unique trigger event
  subject: string,                    // "Your submission {{submissionTitle}} has been received"
  body: string,                       // Template with {{placeholders}}
  isHtml: boolean,                    // Plain text or HTML email
  ccEmails: string[],                 // Optional CC recipients
  bccEmails: string[],                // Optional BCC recipients
  isEnabled: boolean,                 // Can disable specific events
  availablePlaceholders: string[],    // For UI reference
  description: string                 // When/why this is sent
}
```

### Notification Recipient Rules

**Caretaker Editor** = the editor who most recently assigned a reviewer to the submission. Submission-level notifications go to this editor only, not to all admins. If no editor has handled the submission (DRAFT/SUBMITTED with no assignments), no admin-side emails are sent.

### Email Event Types

| Event | Recipient       | Trigger |
|-------|-----------------|---------|
| `SUBMISSION_RECEIVED` | Author          | After successful submission |
| `SUBMISSION_WITHDRAWN` | Caretaker Editor | When author withdraws a handled submission (no email for unhandled DRAFT/SUBMITTED) |
| `REVIEWER_ASSIGNED` | Reviewer        | When editor assigns review |
| `REVIEWER_REMINDER` | Reviewer        | Deadline approaching (configurable days) |
| `REVIEW_SUBMITTED` | Assigning Editor | When reviewer submits review |
| `ALL_REVIEWS_COMPLETE` | Assigning Editor | Last review submitted |
| `DECISION_ACCEPTED` | Author          | Final acceptance |
| `DECISION_CONDITIONALLY_ACCEPTED` | Author          | Conditional acceptance |
| `DECISION_REVISE_REQUIRED` | Author          | Revisions needed |
| `DECISION_REJECTED` | Author          | Rejection |
| `REVISION_REMINDER` | Author          | Revision deadline approaching |
| `REVISION_RECEIVED` | Caretaker Editor | Author resubmits |
| `DECISION_OVERRIDDEN` | Author          | Editor overrides previous decision |
| `DEADLINE_APPROACHING` | Reviewer/Author | Generic deadline warning |
| `ACCOUNT_CREATED` | User            | New account created |
| `PASSWORD_RESET` | User            | Password reset requested |
| `EMAIL_VERIFICATION` | User            | Email verification link |
| `INVITATION` | Invited user    | Invitation to join the system |
| `EXHIBITOR_APPROVED` | Exhibitor       | Organizer approves the exhibitor application |
| `EXHIBITOR_REJECTED` | Exhibitor       | Organizer rejects the exhibitor application |

### Available Placeholders

**User placeholders:**
```
{{userName}}          - Full name
{{userEmail}}         - Email address
{{userRole}}          - Current role
```

**Submission placeholders:**
```
{{submissionId}}      - Unique ID
{{submissionTitle}}   - Title
{{submissionType}}    - ABSTRACT/FULL_PAPER/POSTER/EXHIBITOR
{{submissionStatus}}  - Current status
{{submissionRound}}   - Review round number
{{submissionUrl}}     - Direct link to submission
```

**Review placeholders:**
```
{{reviewerName}}      - Reviewer name (if not blind)
{{reviewDeadline}}    - Deadline date
{{daysRemaining}}     - Days until deadline
{{reviewDecision}}    - Reviewer recommendation
```

**Conference placeholders:**
```
{{conferenceName}}    - Conference name
{{conferenceEmail}}   - Contact email
{{conferenceWebsite}} - Website URL
```

**Decision placeholders:**
```
{{editorName}}        - Editor who made decision
{{decisionReason}}    - Brief reasoning
{{decisionLetter}}    - Full letter to author
```

**Exhibitor placeholders** (EXHIBITOR_APPROVED / EXHIBITOR_REJECTED only):
```
{{firstName}}         - Exhibitor's first name
{{companyName}}       - Company name from the application
{{reason}}            - Decision reason entered by the organizer
{{conferenceName}}    - Conference name
```

### Email Processing

Email sending is asynchronous:
1. Workflow triggers event (e.g., submission.status = ACCEPTED)
2. System looks up EmailTemplate for DECISION_ACCEPTED
3. If template.isEnabled === true:
   - Replace all {{placeholders}} with actual values
   - Queue email for sending (background job)
   - Log email attempt
4. Email service processes queue
5. Handle failures with retry logic


### Template Management UI

Admin interface should allow:
- List all email templates
- Edit subject/body with live placeholder preview
- Enable/disable specific events
- Test send with sample data (to yourself)
- View sent email history
- See available placeholders per template

---

## Planned Features (Not Implemented)

### Conflict of Interest (COI) Management

Planned for future versions:
- Reviewer self-declaration of conflicts with authors
- Automatic COI detection based on co-authorship history, affiliations
- COI-aware reviewer assignment suggestions
- Blocked assignments for declared conflicts

---

## Implementation Notes

### xstate Integration

Each submission type uses a single shared state machine (`submissionMachine`).

> **Note:** The machine starts at `DRAFT`. Authors can save a draft and return later, or submit directly (creating with status `SUBMITTED` bypasses the DRAFT state). From DRAFT, the author can submit (`SUBMIT → SUBMITTED`) or withdraw (`WITHDRAW → WITHDRAWN`). No versioning or review logic applies in DRAFT — only free-form editing.

```typescript
export const abstractMachine = createMachine({
  id: 'abstract',
  initial: 'DRAFT',
  states: {
    DRAFT: {
      on: {
        SUBMIT: 'SUBMITTED',
        WITHDRAW: 'WITHDRAWN'
      }
    },
    SUBMITTED: {
      on: {
        ASSIGN_REVIEWER: 'UNDER_REVIEW',
        DESK_REJECT: 'REJECTED',
        WITHDRAW: 'WITHDRAWN'
      }
    },
    UNDER_REVIEW: {
      on: {
        REVIEW_SUBMITTED: 'REVIEWS_COMPLETE',
        WITHDRAW: 'WITHDRAWN'
      }
    },
    REVIEWS_COMPLETE: {
      on: {
        AUTO_ACCEPT: 'ACCEPTED',
        AUTO_REJECT: 'REJECTED',
        AUTO_REVISE: 'REVISE_REQUIRED',
        AUTO_CONDITIONAL: 'CONDITIONALLY_ACCEPTED',
        WITHDRAW: 'WITHDRAWN'
      }
    },
    AWAITING_DECISION: {
      on: {
        EDITOR_ACCEPT: 'ACCEPTED',
        EDITOR_CONDITIONAL: 'CONDITIONALLY_ACCEPTED',
        EDITOR_REVISE: 'REVISE_REQUIRED',
        EDITOR_REJECT: 'REJECTED',
        WITHDRAW: 'WITHDRAWN'
      }
    },
    REVISE_REQUIRED: {
      on: {
        RESUBMIT: 'RESUBMITTED',
        WITHDRAW: 'WITHDRAWN'
      }
    },
    RESUBMITTED: {
      on: {
        ASSIGN_REVIEWER: 'UNDER_REVIEW',
        WITHDRAW: 'WITHDRAWN'
      }
    },
    ACCEPTED: { on: { EDITOR_OVERRIDE: 'AWAITING_DECISION' } },
    REJECTED: { on: { EDITOR_OVERRIDE: 'AWAITING_DECISION' } },
    CONDITIONALLY_ACCEPTED: { on: {
      CONFIRM_CONDITIONS_MET: 'ACCEPTED',
      EDITOR_OVERRIDE: 'AWAITING_DECISION'
    } },
    WITHDRAWN: { type: 'final' }
  }
})
```
