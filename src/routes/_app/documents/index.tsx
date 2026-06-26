import { IconDownload, IconFileCertificate } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { authRouteMiddleware } from "@/features/auth/server/middleware";
import { myDocumentsQueryOptions } from "@/features/documents/api/documents";
import { formatBytes } from "@/features/documents/components/document-bits";
import { PageHeader } from "@/shared/components/layout/page-header";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { Button } from "@/shared/ui/button";

export const Route = createFileRoute("/_app/documents/")({
	server: {
		middleware: [authRouteMiddleware],
	},
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(myDocumentsQueryOptions());
	},
	component: MyDocumentsPage,
});

function MyDocumentsPage() {
	const { formatDateTime } = useDateFormat();
	const { data: documents = [] } = useQuery(myDocumentsQueryOptions());

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconFileCertificate} title="My Documents" />
			<div className="flex-1 overflow-auto p-4 sm:p-8">
				<div className="mx-auto max-w-2xl space-y-2">
					{documents.length === 0 ? (
						<div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
							No documents have been issued to you yet.
						</div>
					) : (
						documents.map((d) => (
							<div
								key={d.id}
								data-testid="my-document-row"
								className="flex items-center gap-3 rounded-lg border bg-card p-4"
							>
								<div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
									<IconFileCertificate className="size-5" />
								</div>
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-medium">{d.name}</p>
									<p className="text-xs text-muted-foreground">
										{formatDateTime(d.createdAt)} · {formatBytes(d.size)}
									</p>
								</div>
								<Button
									asChild
									variant="outline"
									size="sm"
									data-testid="download-my-document"
								>
									<a href={`/api/documents/${d.id}`}>
										<IconDownload className="mr-2 size-4" />
										Download
									</a>
								</Button>
							</div>
						))
					)}
				</div>
			</div>
		</div>
	);
}
