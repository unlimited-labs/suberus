import { createServerFn } from "@tanstack/react-start";
import { adminOnlyMiddleware } from "@/features/auth/server/middleware";
import { sanitizeProgramFooterHtml } from "@/features/planner/server/sanitize-footer-html";
import { setSetting } from "@/features/settings/server/settings";
import { programFooterHtmlSchema } from "@/features/settings/validations";

export const updateProgramFooterHtmlFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.validator(programFooterHtmlSchema)
	.handler(async ({ data }) => {
		await setSetting(
			"PROGRAM_FOOTER_HTML",
			sanitizeProgramFooterHtml(data.html),
		);
	});
