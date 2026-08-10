import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkEmailAvailable } from "@/features/auth/server/auth";
import { enforceRateLimit } from "@/shared/server/rate-limit";

export const checkEmailAvailableFn = createServerFn({ method: "GET" })
	.validator(z.object({ email: z.string() }))
	.handler(async ({ data }) => {
		enforceRateLimit("check-email", 20, 60_000);
		return checkEmailAvailable(data.email);
	});
