import { IconFileExport } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { adminRouteMiddleware } from "@/features/auth/server/middleware";
import { printExportDataQueryOptions } from "@/features/planner/api/print-export";
import { scheduleIssuesQueryOptions } from "@/features/planner/api/schedule";
import { ExportOptionsPanel } from "@/features/planner/components/print-export/export-options-panel";
import { usePrintExport } from "@/features/planner/components/print-export/use-print-export";
import { PRINT_FORMATS } from "@/features/planner/print/print-options-schema";
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
					className="bg-muted/50 text-muted-foreground flex min-h-64 min-w-0 flex-1 items-center justify-center rounded-xl p-4 text-sm md:p-6"
					data-testid="print-preview"
				>
					Preview
				</section>
			</div>
		</>
	);
}
