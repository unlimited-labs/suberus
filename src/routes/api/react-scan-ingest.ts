import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Dev-only ingest for react-scan/lite render events. Each POST is one event;
// we append it as a JSONL line so it can be read and aggregated offline.
const OUT_DIR = join(process.cwd(), "dev-docs", "react-scan");
const sanitize = (value: string | undefined): string =>
	String(value ?? "unknown").replace(/[^a-zA-Z0-9_-]/g, "") || "unknown";

export const Route = createFileRoute("/api/react-scan-ingest")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				if (
					!import.meta.env.DEV ||
					import.meta.env.VITE_REACT_SCAN !== "true"
				) {
					return new Response(null, { status: 404 });
				}
				const payload = await request.json();
				const sessionId = sanitize(
					z.string().safeParse(payload?.sessionId).data,
				);
				await mkdir(OUT_DIR, { recursive: true });
				await appendFile(
					join(OUT_DIR, `${sessionId}.jsonl`),
					`${JSON.stringify(payload)}\n`,
				);
				return new Response(null, { status: 204 });
			},
		},
	},
});
