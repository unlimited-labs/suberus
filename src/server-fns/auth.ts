import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkEmailAvailable } from "@/lib/server/auth";

export const checkEmailAvailableFn = createServerFn({ method: "GET" })
	.inputValidator(z.object({ email: z.string() }))
	.handler(async ({ data }) => {
		return checkEmailAvailable(data.email);
	});
