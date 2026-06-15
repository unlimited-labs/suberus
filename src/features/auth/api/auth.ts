import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkEmailAvailable } from "@/features/auth/server/auth";

export const checkEmailAvailableFn = createServerFn({ method: "GET" })
	.validator(z.object({ email: z.string() }))
	.handler(async ({ data }) => {
		return checkEmailAvailable(data.email);
	});
