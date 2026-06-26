-- Seed the default template for the "document generated" notification email.
INSERT INTO "email_templates" ("id", "eventType", "subject", "body", "isHtml", "ccEmails", "bccEmails", "isEnabled", "availablePlaceholders", "description", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'DOCUMENT_GENERATED', 'A new document is available — {{conferenceName}}', E'Dear {{firstName}},\n\nA new document ("{{documentName}}") has been added to your account.\n\nYou can view and download it here:\n{{documentsUrl}}\n\n{{conferenceName}}', false, '{}', '{}', true, '{"firstName","documentName","documentsUrl","conferenceName"}', 'Sent to a participant when an organizer generates a document for them', NOW(), NOW())
ON CONFLICT ("eventType") DO NOTHING;
