import {
	IconArrowLeft,
	IconDownload,
	IconFileExport,
} from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useDeferredValue } from "react";
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
import { Button } from "@/shared/ui/button";

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
		conferenceName: data.source.conferenceName,
		sessionCount: data.source.sessions.length,
		idmlAvailable: data.idmlAvailable,
	});
	const options = useDeferredValue(exporter.options);
	const sheet = useDeferredValue(format === "xlsx");
	const program = buildPrintProgram(data.source, {
		language: options.language,
		includeCancelled: options.includeCancelled,
	});
	const doc = sheet ? null : buildPrintDocument(program, options, data.logo);
	const sheets = sheet ? buildXlsxSheets(program, options) : [];

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconFileExport} title="Export printed program">
				<Button asChild size="sm" variant="ghost">
					<Link aria-label="Back to planner" to="/admin/program-planner">
						<IconArrowLeft />
						<span className="hidden sm:inline">Back to planner</span>
					</Link>
				</Button>
				<Button
					data-testid="print-download"
					disabled={
						exporter.blockedReason !== null || exporter.download.isPending
					}
					onClick={() => exporter.download.mutate()}
					size="sm"
				>
					<IconDownload />
					{exporter.download.isPending ? "Generating…" : "Download"}
				</Button>
			</PageHeader>
			<div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4 md:flex-row md:p-6">
				<ExportOptionsPanel
					blockedReason={exporter.blockedReason}
					draft={draft}
					fileName={exporter.fileName}
					format={format}
					hasLogo={data.logo !== null}
					idmlAvailable={data.idmlAvailable}
					issues={issues}
					onFormatChange={(f) =>
						void navigate({ search: { format: f }, replace: true })
					}
					options={exporter.options}
					partsError={exporter.partsError}
					set={exporter.set}
				/>
				<section
					className="bg-muted/50 min-w-0 flex-1 rounded-xl p-3 md:p-6"
					data-testid="print-preview"
				>
					{sheet ? (
						<SheetPreview sheets={sheets} />
					) : (
						doc && <PrintPreview approximate={format === "idml"} doc={doc} />
					)}
				</section>
			</div>
		</div>
	);
}
