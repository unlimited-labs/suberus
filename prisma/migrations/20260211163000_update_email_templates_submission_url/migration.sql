-- Update availablePlaceholders: replace submissionId with submissionUrl
UPDATE email_templates
SET "availablePlaceholders" = array_replace("availablePlaceholders", 'submissionId', 'submissionUrl')
WHERE "eventType" IN ('SUBMISSION_RECEIVED', 'SUBMISSION_WITHDRAWN')
  AND 'submissionId' = ANY("availablePlaceholders");

-- Update default body text for SUBMISSION_RECEIVED (only if still using default)
UPDATE email_templates
SET body = replace(body, 'Submission ID: {{submissionId}}', 'View your submission: {{submissionUrl}}')
WHERE "eventType" = 'SUBMISSION_RECEIVED'
  AND body LIKE '%Submission ID: {{submissionId}}%';

-- Update default body text for SUBMISSION_WITHDRAWN (only if still using default)
UPDATE email_templates
SET body = replace(body, '(ID: {{submissionId}})', '{{submissionUrl}}')
WHERE "eventType" = 'SUBMISSION_WITHDRAWN'
  AND body LIKE '%(ID: {{submissionId}})%';
