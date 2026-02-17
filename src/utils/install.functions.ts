import { createServerFn } from "@tanstack/react-start";
import { installSchema } from "@/lib/validations/install";
import { isSystemInstalled, performInstall } from "./install.server";

export const checkInstallStatusFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const installed = await isSystemInstalled();
		return { installed };
	},
);

export const performInstallFn = createServerFn({ method: "POST" })
	.inputValidator(installSchema)
	.handler(async ({ data }) => {
		await performInstall(data);
		return { success: true };
	});
