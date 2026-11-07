import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { adminMiddleware } from "@/features/auth/server/middleware";
import { printOptionsSchema } from "@/features/planner/print/print-options-schema";
import { isIdmlAvailable } from "@/features/planner/server/print-idml-client";
import {
	getPrintOptions,
	loadPrintLogo,
	loadPrintSource,
} from "@/features/planner/server/print-program";
import { setSetting } from "@/features/settings/server/settings";

export const getPrintExportDataFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(async () => {
		const [source, options, logo] = await Promise.all([
			loadPrintSource(),
			getPrintOptions(),
			loadPrintLogo(),
		]);
		return { source, options, logo, idmlAvailable: isIdmlAvailable() };
	});

export const savePrintOptionsFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(printOptionsSchema)
	.handler(async ({ data }) => {
		await setSetting("PRINT_EXPORT_OPTIONS", data);
	});

export const printExportDataQueryOptions = () =>
	queryOptions({
		queryKey: ["program", "print-export"],
		queryFn: () => getPrintExportDataFn(),
		refetchOnWindowFocus: false,
	});
