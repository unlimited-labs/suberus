-- Convert existing IN_PROGRESS assignments back to PENDING before removing the enum value
UPDATE "ReviewAssignment" SET "status" = 'PENDING' WHERE "status" = 'IN_PROGRESS';

-- AlterEnum: remove IN_PROGRESS from AssignmentStatus
CREATE TYPE "AssignmentStatus_new" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED', 'OVERDUE');
ALTER TABLE "ReviewAssignment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ReviewAssignment" ALTER COLUMN "status" TYPE "AssignmentStatus_new" USING ("status"::text::"AssignmentStatus_new");
ALTER TYPE "AssignmentStatus" RENAME TO "AssignmentStatus_old";
ALTER TYPE "AssignmentStatus_new" RENAME TO "AssignmentStatus";
DROP TYPE "AssignmentStatus_old";
ALTER TABLE "ReviewAssignment" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- Delete orphaned REVIEW_STARTED activity logs
DELETE FROM "ActivityLog" WHERE "type" = 'REVIEW_STARTED';

-- AlterEnum: remove REVIEW_STARTED from ActivityType
CREATE TYPE "ActivityType_new" AS ENUM ('USER_REGISTERED', 'USER_EMAIL_VERIFIED', 'USER_PROFILE_UPDATED', 'USER_PASSWORD_CHANGED', 'USER_ROLE_CHANGED', 'USER_TOGGLED_ACTIVE', 'USER_DELETED', 'SUBMISSION_CREATED', 'SUBMISSION_DRAFT_SUBMITTED', 'SUBMISSION_STATUS_CHANGED', 'SUBMISSION_WITHDRAWN', 'SUBMISSION_RESUBMITTED', 'SUBMISSION_TRACK_CHANGED', 'SUBMISSION_DELETED', 'REVIEW_ASSIGNED', 'REVIEW_SUBMITTED', 'REVIEW_CANCELLED', 'REVIEW_OVERDUE', 'DECISION_SUBMITTED', 'DECISION_DESK_REJECT', 'DECISION_OVERRIDE', 'INVITATION_CREATED', 'INVITATION_USED', 'INVITATION_CANCELLED', 'FEE_MARKED_PAID', 'FEE_MARKED_UNPAID');
ALTER TABLE "ActivityLog" ALTER COLUMN "type" TYPE "ActivityType_new" USING ("type"::text::"ActivityType_new");
ALTER TYPE "ActivityType" RENAME TO "ActivityType_old";
ALTER TYPE "ActivityType_new" RENAME TO "ActivityType";
DROP TYPE "ActivityType_old";
