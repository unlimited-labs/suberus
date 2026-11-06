import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import {
	adminMiddleware,
	adminOnlyMiddleware,
} from "@/features/auth/server/middleware";
import { printOptionsSchema } from "@/features/planner/print/print-options-schema";
import {
	getPrintOptions,
	loadPrintSource,
	savePrintOptions,
} from "@/features/planner/server/print-program";
import { getSettings } from "@/features/settings/server/settings";

export const getPrintExportDataFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(async () => {
		const [source, options, logo] = await Promise.all([
			loadPrintSource(),
			getPrintOptions(),
			getSettings(["BRANDING_LOGO_KEY", "BRANDING_LOGO_URL"]),
		]);
		return {
			source,
			options,
			hasLogo: Boolean(logo.BRANDING_LOGO_KEY || logo.BRANDING_LOGO_URL),
		};
	});

export const savePrintOptionsFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.validator(printOptionsSchema)
	.handler(async ({ data }) => {
		await savePrintOptions(data);
	});

export const printExportDataQueryOptions = () =>
	queryOptions({
		queryKey: ["program", "print-export"],
		queryFn: () => getPrintExportDataFn(),
	});
