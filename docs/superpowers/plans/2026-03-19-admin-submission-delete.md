# Admin Submission Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow administrators to delete a submission from the detail page, with warnings about related data (active/completed reviews, in-progress review status).

**Architecture:** Two-stage server check (warnings, not blockers) + confirmation dialog with warnings displayed. Follows the existing `user-delete-dialog` pattern. Hard delete with Prisma cascade.

**Tech Stack:** TanStack Start server functions, React Query, Zod, shadcn Dialog, Prisma transactions.

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `prisma/schema.prisma` | Add `SUBMISSION_DELETED` to `ActivityType` enum |
| Modify | `src/lib/activity-log.ts` | Add `SUBMISSION_DELETED` activity detail type |
| Create | `src/lib/server/admin/submissions.ts` | `checkSubmissionDeleteWarnings()` + `deleteSubmission()` server logic |
| Modify | `src/utils/admin-submissions.functions.ts` | Add `checkSubmissionDeletableFn` + `deleteSubmissionFn` server functions |
| Create | `src/components/admin/submissions/submission-delete-dialog.tsx` | Delete confirmation dialog with warnings |
| Modify | `src/routes/_app/admin/_layout/submissions/$id.tsx` | Add delete button + wire dialog |

---

### Task 1: Add `SUBMISSION_DELETED` activity type (Prisma + TypeScript)

**Files:**
- Modify: `prisma/schema.prisma` — add `SUBMISSION_DELETED` to `ActivityType` enum
- Modify: `src/lib/activity-log.ts` — add `SUBMISSION_DELETED` to `ActivityDetail` union

- [ ] **Step 1: Add enum value to Prisma schema**

In `prisma/schema.prisma`, add `SUBMISSION_DELETED` after `SUBMISSION_TRACK_CHANGED` in the `ActivityType` enum:

```prisma
  SUBMISSION_TRACK_CHANGED
  SUBMISSION_DELETED
```

- [ ] **Step 2: Run Prisma migration**

```bash
pnpm prisma migrate dev --name add-submission-deleted-activity-type
```

- [ ] **Step 3: Add the type to ActivityDetail union in `src/lib/activity-log.ts`**

Add after the `SUBMISSION_TRACK_CHANGED` line:

```typescript
| { type: "SUBMISSION_DELETED"; title: string; sequentialNumber: number }
```

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/lib/activity-log.ts src/generated
git commit -m "feat: add SUBMISSION_DELETED activity type"
```

---

### Task 2: Server logic — check warnings + delete

**Files:**
- Create: `src/lib/server/admin/submissions.ts`

- [ ] **Step 1: Create the server logic file**

```typescript
import { prisma } from "@/db.server";
import { activityDetail } from "@/lib/activity-log";
import { logActivityTx } from "@/lib/server/activity-log";

export interface SubmissionDeleteWarnings {
  warnings: string[];
}

export async function checkSubmissionDeleteWarnings(
  submissionId: string,
): Promise<SubmissionDeleteWarnings> {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: {
      status: true,
      _count: {
        select: {
          reviews: true,
          reviewAssignments: true,
          editorDecisions: true,
        },
      },
    },
  });

  if (!submission) {
    throw new Response("Submission not found", { status: 404 });
  }

  const warnings: string[] = [];

  const activeStatuses = ["UNDER_REVIEW", "REVIEWS_COMPLETE", "AWAITING_DECISION"];
  if (activeStatuses.includes(submission.status)) {
    warnings.push("Submission is in an active review process");
  }

  if (submission._count.reviewAssignments > 0) {
    warnings.push(
      `${submission._count.reviewAssignments} reviewer assignment(s) will be deleted`,
    );
  }

  if (submission._count.reviews > 0) {
    warnings.push(
      `${submission._count.reviews} review(s) will be permanently lost`,
    );
  }

  if (submission._count.editorDecisions > 0) {
    warnings.push(
      `${submission._count.editorDecisions} editor decision(s) will be permanently lost`,
    );
  }

  return { warnings };
}

export async function deleteSubmission(
  submissionId: string,
  performedBy: string,
): Promise<{ success: boolean }> {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: { id: true, title: true, sequentialNumber: true, userId: true },
  });

  if (!submission) {
    throw new Response("Submission not found", { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    // Log deletion as a user-level activity (no submissionId — it's being deleted)
    await logActivityTx(tx, {
      type: "SUBMISSION_DELETED",
      userId: submission.userId,
      performedBy,
      detail: activityDetail("SUBMISSION_DELETED", {
        title: submission.title,
        sequentialNumber: submission.sequentialNumber,
      }),
    });

    // Null out self-referential FKs to avoid circular constraint issues
    await tx.submission.update({
      where: { id: submissionId },
      data: { presenterId: null, currentVersionId: null },
    });

    // Delete submission (cascade handles: versions, authors, keywords,
    // assignments, reviews, decisions, activity logs)
    await tx.submission.delete({ where: { id: submissionId } });
  });

  return { success: true };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/server/admin/submissions.ts
git commit -m "feat: add submission delete server logic with warnings"
```

---

### Task 3: Server functions

**Files:**
- Modify: `src/utils/admin-submissions.functions.ts`

- [ ] **Step 1: Add imports**

Add to imports:

```typescript
import {
  checkSubmissionDeleteWarnings,
  deleteSubmission,
} from "@/lib/server/admin/submissions";
```

- [ ] **Step 2: Add server functions at the end of file**

```typescript
/** Check warnings before deleting a submission */
export const checkSubmissionDeletableFn = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .inputValidator(z.object({ submissionId: z.uuid() }))
  .handler(async ({ data }) => {
    return checkSubmissionDeleteWarnings(data.submissionId);
  });

/** Delete a submission */
export const deleteSubmissionFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(z.object({ submissionId: z.uuid() }))
  .handler(async ({ data, context }) => {
    return deleteSubmission(data.submissionId, context.user.id);
  });
```

- [ ] **Step 3: Commit**

```bash
git add src/utils/admin-submissions.functions.ts
git commit -m "feat: add submission delete server functions"
```

---

### Task 4: Delete dialog component

**Files:**
- Create: `src/components/admin/submissions/submission-delete-dialog.tsx`

- [ ] **Step 1: Create the dialog component**

Follow the `user-delete-dialog.tsx` pattern. Key differences:
- Warnings are non-blocking (always show delete button)
- Warnings displayed in a styled box with destructive colors
- No warnings → simple confirmation

```typescript
import { IconAlertTriangle } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  adminSubmissionsQueryOptions,
  checkSubmissionDeletableFn,
  deleteSubmissionFn,
  editorSubmissionQueryOptions,
} from "@/utils/admin-submissions.functions";

interface SubmissionDeleteDialogProps {
  submissionId: string;
  submissionTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubmissionDeleteDialog({
  submissionId,
  submissionTitle,
  open,
  onOpenChange,
}: SubmissionDeleteDialogProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: check, isLoading } = useQuery({
    queryKey: ["submissions", "admin", submissionId, "deletable"],
    queryFn: () => checkSubmissionDeletableFn({ data: { submissionId } }),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: () => deleteSubmissionFn({ data: { submissionId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: adminSubmissionsQueryOptions().queryKey,
      });
      queryClient.removeQueries({
        queryKey: editorSubmissionQueryOptions(submissionId).queryKey,
      });
      onOpenChange(false);
      toast.success("Submission deleted");
      navigate({ to: "/admin/submissions" });
    },
    onError: (error) => {
      if (error instanceof Response) {
        error.text().then((msg) => toast.error(msg));
      } else {
        toast.error("Failed to delete submission");
      }
    },
  });

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Submission</DialogTitle>
          </DialogHeader>
          <p className="py-4 text-sm text-muted-foreground">Checking...</p>
        </DialogContent>
      </Dialog>
    );
  }

  const hasWarnings = check && check.warnings.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconAlertTriangle className="size-5 text-destructive" />
            Delete Submission
          </DialogTitle>
          <DialogDescription>Permanently delete submission:</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="font-medium">{submissionTitle}</p>
          {hasWarnings && (
            <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 space-y-1">
              <p className="text-sm font-medium text-destructive">Warnings:</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-destructive">
                {check.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            This action cannot be undone. All submission data, including
            versions, reviews, and author links will be permanently removed.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Deleting..." : "Delete Submission"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/submissions/submission-delete-dialog.tsx
git commit -m "feat: add submission delete dialog with warnings"
```

---

### Task 5: Wire delete button into submission detail page

**Files:**
- Modify: `src/routes/_app/admin/_layout/submissions/$id.tsx`

- [ ] **Step 1: Add imports**

Add `IconTrash` to the existing tabler icons import line:

```typescript
import { IconTrash } from "@tabler/icons-react";
```

Add component import:

```typescript
import { SubmissionDeleteDialog } from "@/components/admin/submissions/submission-delete-dialog";
```

- [ ] **Step 2: Add state for delete dialog**

Add alongside other dialog states (after `showOverrideDialog`):

```typescript
const [showDeleteDialog, setShowDeleteDialog] = useState(false);
```

- [ ] **Step 3: Add delete button in the action buttons area**

Add after the last conditional action button (Override Decision), inside the `flex flex-wrap gap-2` div:

```typescript
<Button
  variant="destructive"
  onClick={() => setShowDeleteDialog(true)}
>
  <IconTrash className="size-4 mr-2" />
  Delete
</Button>
```

- [ ] **Step 4: Add dialog instance**

Add after `OverrideDecisionDialog`:

```typescript
<SubmissionDeleteDialog
  submissionId={submission.id}
  submissionTitle={submission.title}
  open={showDeleteDialog}
  onOpenChange={setShowDeleteDialog}
/>
```

- [ ] **Step 5: Commit**

```bash
git add src/routes/_app/admin/_layout/submissions/$id.tsx
git commit -m "feat: add delete button to admin submission detail page"
```

---

### Task 6: Verify build

- [ ] **Step 1: Run lint**

```bash
pnpm lint
```

- [ ] **Step 2: Run build**

```bash
pnpm build
```

- [ ] **Step 3: Fix any issues found**

- [ ] **Step 4: Final commit if fixes needed**
