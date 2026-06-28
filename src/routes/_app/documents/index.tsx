import { IconAlertTriangle, IconFileCertificate } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { authRouteMiddleware } from "@/features/auth/server/middleware";
import { myDocumentsQueryOptions } from "@/features/documents/api/documents";
import { DocumentCard } from "@/features/documents/components/document-card";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Badge } from "@/shared/ui/badge";
import { EmptyState } from "@/shared/ui/empty-state";
import { Skeleton } from "@/shared/ui/skeleton";

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
	const {
		data: documents = [],
		isLoading,
		isError,
	} = useQuery(myDocumentsQueryOptions());

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconFileCertificate} title="My Documents">
				{documents.length > 0 && (
					<Badge variant="secondary">{documents.length}</Badge>
				)}
			</PageHeader>
			<div className="flex-1 overflow-auto p-4 sm:p-8">
				<div className="mx-auto max-w-2xl space-y-2">
					{isLoading ? (
						<DocumentListSkeleton />
					) : isError ? (
						<EmptyState
							icon={IconAlertTriangle}
							title="Couldn't load your documents"
							description="Something went wrong. Refresh the page to try again."
						/>
					) : documents.length === 0 ? (
						<EmptyState
							icon={IconFileCertificate}
							title="No documents yet"
							description="Documents issued to you by the organisers — certificates, invitation letters and the like — will appear here, ready to download."
						/>
					) : (
						documents.map((d) => (
							<DocumentCard
								key={d.id}
								name={d.name}
								createdAt={d.createdAt}
								size={d.size}
								status="READY"
								showStatus={false}
								downloadHref={`/api/documents/${d.id}`}
								prominentDownload
								testId="my-document-row"
								downloadTestId="download-my-document"
							/>
						))
					)}
				</div>
			</div>
		</div>
	);
}

function DocumentListSkeleton() {
	return (
		<>
			{[0, 1, 2].map((i) => (
				<div
					key={i}
					className="flex items-center gap-3 rounded-xl border bg-card p-4"
				>
					<Skeleton className="size-11 rounded-xl" />
					<div className="flex-1 space-y-2">
						<Skeleton className="h-4 w-1/2" />
						<Skeleton className="h-3 w-1/3" />
					</div>
					<Skeleton className="h-9 w-28" />
				</div>
			))}
		</>
	);
}
