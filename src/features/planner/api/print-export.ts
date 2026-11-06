import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import {
	adminMiddleware,
	adminOnlyMiddleware,
} from "@/features/auth/server/middleware";
import { printOptionsSchema } from "@/features/planner/print/print-options-schema";
import { isIdmlAvailable } from "@/features/planner/server/print-idml-client";
import {
	getPrintOptions,
	loadPrintLogo,
	loadPrintSource,
	savePrintOptions,
} from "@/features/planner/server/print-program";

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
	.middleware([adminOnlyMiddleware])
	.validator(printOptionsSchema)
	.handler(async ({ data }) => {
		await savePrintOptions(data);
	});

export const printExportDataQueryOptions = () =>
	queryOptions({
		queryKey: ["program", "print-export"],
		queryFn: () => getPrintExportDataFn(),
		refetchOnWindowFocus: false,
	});
