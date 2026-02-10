import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";

export type Theme = "light" | "dark" | "system";

const COOKIE_NAME = "_preferred-theme";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export const getThemeFn = createServerFn({ method: "GET" }).handler(
	async (): Promise<Theme> => {
		const value = getCookie(COOKIE_NAME);
		if (value === "light" || value === "dark" || value === "system") {
			return value;
		}
		return "system";
	},
);

export const setThemeFn = createServerFn({ method: "POST" })
	.inputValidator(z.enum(["light", "dark", "system"]))
	.handler(async ({ data }) => {
		setCookie(COOKIE_NAME, data, {
			path: "/",
			maxAge: COOKIE_MAX_AGE,
			sameSite: "lax",
		});
		return { success: true };
	});
