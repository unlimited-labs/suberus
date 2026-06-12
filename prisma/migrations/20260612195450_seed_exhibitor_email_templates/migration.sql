-- Seed default templates for exhibitor decision emails
INSERT INTO "email_templates" ("id", "eventType", "subject", "body", "isHtml", "ccEmails", "bccEmails", "isEnabled", "availablePlaceholders", "description", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'EXHIBITOR_APPROVED', 'Your exhibitor application has been approved — {{conferenceName}}', E'Dear {{firstName}},\n\nYour exhibitor application for {{companyName}} has been approved.\n\n{{reason}}\n\nWe look forward to welcoming you at {{conferenceName}}.', false, '{}', '{}', true, '{"firstName","companyName","reason","conferenceName"}', 'Sent to the exhibitor when the organizer approves the application', NOW(), NOW()),
  (gen_random_uuid(), 'EXHIBITOR_REJECTED', 'Your exhibitor application was not accepted — {{conferenceName}}', E'Dear {{firstName}},\n\nWe regret to inform you that your exhibitor application for {{companyName}} has not been accepted.\n\n{{reason}}\n\nThank you for your interest in {{conferenceName}}.', false, '{}', '{}', true, '{"firstName","companyName","reason","conferenceName"}', 'Sent to the exhibitor when the organizer rejects the application', NOW(), NOW())
ON CONFLICT ("eventType") DO NOTHING;
