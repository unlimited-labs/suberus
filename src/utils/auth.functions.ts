import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkEmailAvailable } from "./auth.server";

export const checkEmailAvailableFn = createServerFn({ method: "GET" })
	.inputValidator(z.object({ email: z.string() }))
	.handler(async ({ data }) => {
		return checkEmailAvailable(data.email);
	});
