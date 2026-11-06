import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { adminRequestMiddleware } from "@/features/auth/server/middleware";
import {
	PRINT_FORMATS,
	printOptionsSchema,
} from "@/features/planner/print/print-options-schema";
import {
	buildPrintFile,
	PrintFormatUnavailableError,
} from "@/features/planner/server/print-export";

const querySchema = z.object({
	format: z.enum(PRINT_FORMATS),
	options: z
		.string()
		.transform((raw, ctx) => {
			try {
				return JSON.parse(raw);
			} catch {
				ctx.addIssue({ code: "custom", message: "options must be JSON" });
				return z.NEVER;
			}
		})
		.pipe(printOptionsSchema),
});

export const Route = createFileRoute("/api/admin/program/print")({
	server: {
		middleware: [adminRequestMiddleware],
		handlers: {
			GET: async ({ request }) => {
				const parsed = querySchema.safeParse(
					Object.fromEntries(new URL(request.url).searchParams),
				);
				if (!parsed.success)
					return Response.json(
						{ error: z.prettifyError(parsed.error) },
						{ status: 400 },
					);
				try {
					const file = await buildPrintFile(
						parsed.data.format,
						parsed.data.options,
					);
					return new Response(file.body, {
						headers: {
							"Content-Type": file.contentType,
							"Content-Disposition": `attachment; filename="${file.filename}"`,
						},
					});
				} catch (error) {
					if (error instanceof PrintFormatUnavailableError)
						return Response.json({ error: error.message }, { status: 501 });
					throw error;
				}
			},
		},
	},
});
