import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		NODE_ENV: z.string().default("development"),
		LOG_LEVEL: z.coerce.number().default(3),

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
		SMTP_FROM_NAME: z.string(),

		AUTH_SECRET: z.string(),
		PORT: z.coerce.number().default(3000),

		E2E: z.stringbool().default(false),
	},

	/**
	 * The prefix that client-side variables must have. This is enforced both at
	 * a type-level and at runtime.
	 */
	clientPrefix: "VITE_",

	client: {
		VITE_APP_TITLE: z.string().min(1).optional(),
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
