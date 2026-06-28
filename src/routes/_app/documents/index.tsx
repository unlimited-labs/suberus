import { IconAlertTriangle, IconFileCertificate } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { authRouteMiddleware } from "@/features/auth/server/middleware";
import { myDocumentsQueryOptions } from "@/features/documents/api/documents";
import { MyDocumentCard } from "@/features/documents/components/my-document-card";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Badge } from "@/shared/ui/badge";
import { EmptyState } from "@/shared/ui/empty-state";
import { SectionCard } from "@/shared/ui/section-card";
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
				<div className="mx-auto max-w-5xl">
					<SectionCard
						icon={IconFileCertificate}
						title="Your documents"
						description="Documents issued by the organisers."
					>
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
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
								{documents.map((d) => (
									<MyDocumentCard
										key={d.id}
										name={d.name}
										createdAt={d.createdAt}
										downloadHref={`/api/documents/${d.id}`}
									/>
								))}
							</div>
						)}
					</SectionCard>
				</div>
			</div>
		</div>
	);
}

function DocumentListSkeleton() {
	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{[0, 1, 2].map((i) => (
				<div key={i} className="overflow-hidden rounded-2xl border bg-card">
					<Skeleton className="h-28 w-full rounded-none" />
					<div className="space-y-3 p-4">
						<Skeleton className="h-4 w-3/4" />
						<Skeleton className="h-3 w-1/3" />
						<Skeleton className="h-9 w-full" />
					</div>
				</div>
			))}
		</div>
	);
}
