import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import { logLevel } from "./log-level";

const processEnv = "process" in globalThis ? process.env : {};

export const env = createEnv({
	shared: {
		NODE_ENV: z.string().default("development"),
		LOG_LEVEL: logLevel,
	},

	clientPrefix: "VITE_",
	client: {
		// Mirror of server VAPID_PUBLIC_KEY (private key never reaches the client).
		VITE_VAPID_PUBLIC_KEY: z.string().optional(),
	},

	server: {
		DATABASE_URL: z.url(),
		APP_BASE_URL: z.url(),

		// S3-compatible object storage (optional - only for FILE-based submissions)
		S3_ENDPOINT: z.url().optional(),
		S3_ACCESS_KEY_ID: z.string().optional(),
		S3_SECRET_ACCESS_KEY: z.string().optional(),
		S3_BUCKET: z.string().optional(),
		// Region: "garage" by default (Garage's fixed region); set to your
		// backend's real region for AWS S3 / other providers.
		S3_REGION: z.string().default("garage"),

		// Deprecated GARAGE_* aliases — still honored as fallbacks in storage.ts.
		GARAGE_ENDPOINT: z.url().optional(),
		GARAGE_ACCESS_KEY_ID: z.string().optional(),
		GARAGE_SECRET_ACCESS_KEY: z.string().optional(),
		GARAGE_BUCKET: z.string().optional(),

		SMTP_HOST: z.string(),
		SMTP_PORT: z.coerce.number(),
		SMTP_SECURE: z.stringbool().default(false),
		SMTP_USER: z.string().optional(),
		SMTP_PASSWORD: z.string().optional(),
		SMTP_FROM_EMAIL: z.email(),

		BULK_EMAIL_DELAY_SECONDS: z.coerce.number().nonnegative().default(5),

		MAX_UPLOAD_SIZE_MB: z.coerce.number().int().positive().default(10),

		// OpenAI-compatible endpoint (Ollama /v1, llama.cpp, vLLM, etc.)
		LLM_API_URL: z.url().optional(),
		LLM_API_KEY: z.string().optional(),
		LLM_MODEL: z.string().optional(),
		LLM_EMBEDDING_MODEL: z.string().optional(),

		// PDF API (docling-powered; optional, enhances LLM extraction with better markdown)
		PDF_API_URL: z.url().optional(),

		// docx-api (optional, DOCX->HTML normalize bundle for the version-diff pipeline)
		DOCX_API_URL: z.url().optional(),
		// Shared secret sent as a bearer token to the docx-api sidecar. The sidecar
		// holds the org signing key + P12 password, so set this in any shared/prod
		// env; when unset the sidecar leaves /v1 open (local dev / E2E only).
		DOCX_API_TOKEN: z.string().optional(),

		// Planner API (optional, enables auto session clustering)
		PLANNER_API_URL: z.url().optional(),
		LLM_CONCURRENCY: z.coerce.number().int().positive().default(4),

		// Also derives the at-rest encryption key for the P12 signing password
		// (sha256 of this). Enforce real entropy — a weak secret weakens both the
		// session signer and the stored signing-cert password.
		AUTH_SECRET: z.string().min(32),

		// Web Push (VAPID). The public key is declared once as
		// VITE_VAPID_PUBLIC_KEY (client block) and read from there on the server.
		VAPID_PRIVATE_KEY: z.string().optional(),
		VAPID_SUBJECT: z.string().optional(),

		E2E: z.stringbool().default(false),

		// Off by default: enabling it exposes the OAuth 2.1 endpoints.
		MCP_ENABLED: z.stringbool().default(false),
		// Origins allowed to register as MCP clients via CIMD. Empty = any.
		MCP_CIMD_ALLOWED_ORIGINS: z
			.string()
			.default("")
			.transform((v) =>
				v
					.split(",")
					.map((o) => o.trim())
					.filter(Boolean),
			),

		// Build metadata (injected at build time via Docker ARG/ENV)
		GIT_COMMIT: z.string().default("unknown"),
		BUILD_DATE: z.string().default("unknown"),

		VERSION_POLL_INTERVAL_MS: z.coerce
			.number()
			.int()
			.positive()
			.default(60_000),
	},

	/**
	 * In production SSR builds, Vite statically replaces `import.meta.env`
	 * so we merge with `process.env` to ensure runtime vars are available.
	 */
	runtimeEnv: { ...import.meta.env, ...processEnv },
	emptyStringAsUndefined: true,
});
