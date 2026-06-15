import { createServerFn } from "@tanstack/react-start";
import {
	isSystemInstalled,
	performInstall,
} from "@/features/install/server/install";
import { installSchema } from "@/features/install/validations";

export const checkInstallStatusFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const installed = await isSystemInstalled();
		return { installed };
	},
);

export const performInstallFn = createServerFn({ method: "POST" })
	.validator(installSchema)
	.handler(async ({ data }) => {
		await performInstall(data);
		return { success: true };
	});
