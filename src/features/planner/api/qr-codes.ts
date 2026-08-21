import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import {
	adminMiddleware,
	adminOnlyMiddleware,
} from "@/features/auth/server/middleware";
import { defaultQrTargets } from "@/features/planner/server/qr-codes";
import { programQrSettingsSchema } from "@/features/planner/validations";
import { setSetting } from "@/features/settings/server/settings";

export const saveProgramQrSettingsFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.validator(programQrSettingsSchema)
	.handler(async ({ data }) => {
		await setSetting("PROGRAM_QR", data);
	});

export const getQrDefaultTargetsFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(async () => defaultQrTargets());

export const qrDefaultTargetsQueryOptions = () =>
	queryOptions({
		queryKey: ["program", "qr", "default-targets"],
		queryFn: () => getQrDefaultTargetsFn(),
	});
