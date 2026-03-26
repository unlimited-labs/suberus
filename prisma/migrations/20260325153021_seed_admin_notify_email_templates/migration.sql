-- Seed default templates for admin notification emails
INSERT INTO "email_templates" ("id", "eventType", "subject", "body", "isHtml", "ccEmails", "bccEmails", "isEnabled", "availablePlaceholders", "description", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'NEW_REGISTRATION_NOTIFY', 'New Registration: {{firstName}} {{lastName}}', E'A new user has registered.\n\nName: {{firstName}} {{lastName}}\nAffiliation: {{affiliation}}', false, '{}', '{}', true, '{"firstName","lastName","affiliation"}', 'Sent to the contact email when a new user registers', NOW(), NOW()),
  (gen_random_uuid(), 'NEW_SUBMISSION_NOTIFY', 'New Submission: {{submissionTitle}}', E'A new submission has been created.\n\nTitle: {{submissionTitle}}\nAuthors: {{authors}}\n\nView: {{submissionUrl}}', false, '{}', '{}', true, '{"submissionTitle","authors","submissionUrl"}', 'Sent to the contact email when a new submission is created', NOW(), NOW())
ON CONFLICT ("eventType") DO NOTHING;
