import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	shared: {
		NODE_ENV: z.string().default("development"),
		LOG_LEVEL: z.coerce.number().default(3),
	},

	clientPrefix: "VITE_",
	client: {},

	server: {
		DATABASE_URL: z.url(),
		APP_BASE_URL: z.url(),

		// Garage S3 storage (optional - only needed for FILE-based submissions)
		GARAGE_ENDPOINT: z.url().optional(),
		GARAGE_ACCESS_KEY_ID: z.string().optional(),
		GARAGE_SECRET_ACCESS_KEY: z.string().optional(),
		GARAGE_BUCKET: z.string().optional(),

		// Mail configuration
		SMTP_HOST: z.string(),
		SMTP_PORT: z.coerce.number(),
		SMTP_SECURE: z.stringbool().default(false),
		SMTP_USER: z.string().optional(),
		SMTP_PASSWORD: z.string().optional(),
		SMTP_FROM_EMAIL: z.email(),

		// LLM API (optional, for AI-assisted document extraction)
		// OpenAI-compatible endpoint (Ollama /v1, llama.cpp, vLLM, etc.)
		LLM_API_URL: z.url().optional(),
		LLM_API_KEY: z.string().optional(),
		LLM_MODEL: z.string().optional(),

		// Docling API (optional, enhances LLM extraction with better markdown)
		DOCLING_URL: z.url().optional(),

		AUTH_SECRET: z.string(),

		E2E: z.stringbool().default(false),
	},

	/**
	 * What object holds the environment variables at runtime. This is usually
	 * `process.env` or `import.meta.env`.
	 *
	 * In production SSR builds, Vite statically replaces `import.meta.env`
	 * so we merge with `process.env` to ensure runtime vars are available.
	 */
	runtimeEnv: {
		...import.meta.env,
		...("process" in globalThis ? process.env : {}),
	},

	/**
	 * By default, this library will feed the environment variables directly to
	 * the Zod validator.
	 *
	 * This means that if you have an empty string for a value that is supposed
	 * to be a number (e.g. `PORT=` in a ".env" file), Zod will incorrectly flag
	 * it as a type mismatch violation. Additionally, if you have an empty string
	 * for a value that is supposed to be a string with a default value (e.g.
	 * `DOMAIN=` in an ".env" file), the default value will never be applied.
	 *
	 * In order to solve these issues, we recommend that all new projects
	 * explicitly specify this option as true.
	 */
	emptyStringAsUndefined: true,
});
