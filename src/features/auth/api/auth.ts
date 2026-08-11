import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkEmailAvailable } from "@/features/auth/server/auth";
import { allowRequest } from "@/shared/server/rate-limit";

export const checkEmailAvailableFn = createServerFn({ method: "GET" })
	.validator(z.object({ email: z.string() }))
	.handler(async ({ data }) => {
		// Fail open: past the limit the endpoint stops answering the enumeration
		// question at all, rather than blocking the caller's registration. A real
		// duplicate is still rejected by sign-up.
		if (!allowRequest("check-email", 20, 60_000)) return { available: true };
		return checkEmailAvailable(data.email);
	});
