-- Seed the default template for accounts created by an organizer from the admin panel.
INSERT INTO "email_templates" ("id", "eventType", "subject", "body", "isHtml", "ccEmails", "bccEmails", "isEnabled", "availablePlaceholders", "description", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'ACCOUNT_CREATED_BY_ADMIN', 'An account has been created for you — {{conferenceName}}', E'Dear {{firstName}},\n\nAn account has been created for you at {{conferenceName}}.\n\nYour login: {{email}}\n\nSet your password here (link valid for 7 days):\n{{setPasswordUrl}}\n\n{{conferenceName}}', false, '{}', '{}', true, '{"firstName","email","setPasswordUrl","conferenceName"}', 'Sent when an organizer creates a user account from the admin panel', NOW(), NOW())
ON CONFLICT ("eventType") DO NOTHING;
