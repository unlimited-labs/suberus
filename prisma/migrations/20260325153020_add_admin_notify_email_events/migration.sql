-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EmailEventType" ADD VALUE 'NEW_REGISTRATION_NOTIFY';
ALTER TYPE "EmailEventType" ADD VALUE 'NEW_SUBMISSION_NOTIFY';

-- Seed default templates for existing installations
INSERT INTO "email_templates" ("id", "eventType", "subject", "body", "isHtml", "ccEmails", "bccEmails", "isEnabled", "availablePlaceholders", "description", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'NEW_REGISTRATION_NOTIFY', 'New Registration: {{firstName}} {{lastName}}', E'A new user has registered.\n\nName: {{firstName}} {{lastName}}\nAffiliation: {{affiliation}}', false, '{}', '{}', true, '{"firstName","lastName","affiliation"}', 'Sent to the contact email when a new user registers', NOW(), NOW()),
  (gen_random_uuid(), 'NEW_SUBMISSION_NOTIFY', 'New Submission: {{submissionTitle}}', E'A new submission has been created.\n\nTitle: {{submissionTitle}}\nAuthors: {{authors}}\n\nView: {{submissionUrl}}', false, '{}', '{}', true, '{"submissionTitle","authors","submissionUrl"}', 'Sent to the contact email when a new submission is created', NOW(), NOW())
ON CONFLICT ("eventType") DO NOTHING;
