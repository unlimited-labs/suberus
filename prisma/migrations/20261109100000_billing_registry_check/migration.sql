-- Registry checks were always on before this setting existed.
UPDATE "app_settings"
SET "value" = jsonb_set("value", '{registryCheck}', 'true'::jsonb)
WHERE "key" = 'BILLING_DETAILS' AND NOT ("value" ? 'registryCheck');
