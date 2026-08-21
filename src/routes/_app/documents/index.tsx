import {
	IconAlertTriangle,
	IconFileCertificate,
	IconShieldCheck,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { authRouteMiddleware } from "@/features/auth/server/middleware";
import { myDocumentsQueryOptions } from "@/features/documents/api/documents";
import { MyDocumentCard } from "@/features/documents/components/my-document-card";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
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
				<Button
					asChild
					className="ml-auto"
					data-testid="verify-document-link"
					size="sm"
					variant="ghost"
				>
					<Link to="/verify-document">
						<IconShieldCheck className="mr-2 size-4" />
						Verify a document
					</Link>
				</Button>
			</PageHeader>
			<div className="flex-1 overflow-auto p-4 sm:p-8">
				<div className="mx-auto max-w-5xl">
					<SectionCard
						description="Documents issued by the organisers."
						icon={IconFileCertificate}
						title="Your documents"
					>
						{isLoading ? (
							<DocumentListSkeleton />
						) : isError ? (
							<EmptyState
								description="Something went wrong. Refresh the page to try again."
								icon={IconAlertTriangle}
								title="Couldn't load your documents"
							/>
						) : documents.length === 0 ? (
							<EmptyState
								description="Documents issued to you by the organisers — certificates, invitation letters and the like — will appear here, ready to download."
								icon={IconFileCertificate}
								title="No documents yet"
							/>
						) : (
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
								{documents.map((d) => (
									<MyDocumentCard
										createdAt={d.createdAt}
										downloadHref={`/api/documents/${d.id}`}
										key={d.id}
										name={d.name}
										signed={d.signed}
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
				<div className="overflow-hidden rounded-2xl border bg-card" key={i}>
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
