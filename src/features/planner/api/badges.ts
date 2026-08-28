import { createServerFn } from "@tanstack/react-start";
import { adminOnlyMiddleware } from "@/features/auth/server/middleware";
import { setProgramBadges } from "@/features/planner/server/presentations";
import { programBadgesSchema } from "@/features/planner/validations";

export const saveProgramBadgesFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.validator(programBadgesSchema)
	.handler(async ({ data }) => {
		await setProgramBadges(data);
	});
