import { IconFileExport } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { z } from "zod";
import { adminRouteMiddleware } from "@/features/auth/server/middleware";
import { printExportDataQueryOptions } from "@/features/planner/api/print-export";
import { scheduleIssuesQueryOptions } from "@/features/planner/api/schedule";
import { ExportOptionsPanel } from "@/features/planner/components/print-export/export-options-panel";
import { PrintPreview } from "@/features/planner/components/print-export/print-preview";
import { SheetPreview } from "@/features/planner/components/print-export/sheet-preview";
import { usePrintExport } from "@/features/planner/components/print-export/use-print-export";
import { buildPrintDocument } from "@/features/planner/print/print-document-rules";
import { PRINT_FORMATS } from "@/features/planner/print/print-options-schema";
import { buildPrintProgram } from "@/features/planner/print/print-program-rules";
import { buildXlsxSheets } from "@/features/planner/print/print-xlsx-rules";
import { PageHeader } from "@/shared/components/layout/page-header";

const searchSchema = z.object({ format: z.enum(PRINT_FORMATS).catch("docx") });

export const Route = createFileRoute(
	"/_app/admin/_layout/program-planner/export",
)({
	server: { middleware: [adminRouteMiddleware] },
	validateSearch: searchSchema,
	loader: async ({ context }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(printExportDataQueryOptions()),
			context.queryClient.ensureQueryData(scheduleIssuesQueryOptions()),
		]);
	},
	component: PrintExportPage,
});

function PrintExportPage() {
	const { format } = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const { data } = useSuspenseQuery(printExportDataQueryOptions());
	const { data: issues } = useSuspenseQuery(scheduleIssuesQueryOptions());
	const draft = data.source.draft;
	const exporter = usePrintExport({
		format,
		initialOptions: data.options,
		draft,
		sessionCount: data.source.sessions.length,
	});
	const program = useMemo(
		() => buildPrintProgram(data.source, exporter.options),
		[data.source, exporter.options],
	);
	const doc = useMemo(
		() => buildPrintDocument(program, exporter.options, { logo: null }),
		[program, exporter.options],
	);

	return (
		<>
			<PageHeader
				icon={IconFileExport}
				title={`Export printed program${draft ? " (draft)" : ""}`}
			/>
			<div className="flex flex-col gap-6 p-4 md:flex-row md:p-6">
				<ExportOptionsPanel
					blockedReason={exporter.blockedReason}
					downloading={exporter.download.isPending}
					fileName={exporter.fileName}
					format={format}
					hasLogo={data.hasLogo}
					issues={issues}
					onDownload={() => exporter.download.mutate()}
					onFormatChange={(f) =>
						void navigate({ search: { format: f }, replace: true })
					}
					options={exporter.options}
					set={exporter.set}
				/>
				<section
					className="bg-muted/50 min-w-0 flex-1 rounded-xl p-3 md:p-6"
					data-testid="print-preview"
				>
					{format === "xlsx" ? (
						<SheetPreview sheets={buildXlsxSheets(program, exporter.options)} />
					) : (
						<PrintPreview doc={doc} />
					)}
				</section>
			</div>
		</>
	);
}
