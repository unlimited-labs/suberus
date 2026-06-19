-- Drop the global file settings. Max file size is now configured per submission
-- type (SubmissionTypeConfig.maxFileSizeMb); allowed file types are covered by
-- each type's allowedExtensions. The AppSettingKey enum values are intentionally
-- left in place (harmless) to avoid a costly enum recreation.
DELETE FROM "app_settings" WHERE "key" IN ('MAX_FILE_SIZE_MB', 'ALLOWED_FILE_TYPES');
