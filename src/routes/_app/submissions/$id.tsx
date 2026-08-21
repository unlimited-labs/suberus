import { IconArrowLeft, IconEye, IconFileText } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { submissionDetailQueryOptions } from "@/features/submissions/api/submissions";
import {
	ActionsCard,
	ContentTabs,
	InfoCard,
	MobileSidebar,
	StatusCard,
} from "@/features/submissions/components/detail";
import { SubmissionReviewsSection } from "@/features/submissions/components/detail/submission-reviews-section";
import { resolveVersionDisplay } from "@/features/submissions/components/detail/submission-version";
import { EditorDecisionCard } from "@/features/submissions/components/editor-decision-card";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

export const Route = createFileRoute("/_app/submissions/$id")({
	loader: async ({ params, context }) => {
		await context.queryClient.ensureQueryData(
			submissionDetailQueryOptions(params.id),
		);
	},
	component: SubmissionDetailPage,
});

function SubmissionDetailPage() {
	const { id } = Route.useParams();
	const { data } = useSuspenseQuery(submissionDetailQueryOptions(id));

	const [selectedVersion, setSelectedVersion] = useState(
		data?.submission.currentVersion ?? 1,
	);

	if (!data) {
		return <NotFoundState id={id} />;
	}

	const { submission, statusHistory, reviews, decision, versions } = data;
	const isReadOnly = submission.role === "coauthor";
	const displayData = resolveVersionDisplay(
		submission,
		versions,
		selectedVersion,
	);

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconFileText} title="Submission Details">
				<div className="flex items-center gap-2">
					{isReadOnly && (
						<Badge className="gap-1" variant="secondary">
							<IconEye className="size-3" />
							Co-author (read-only)
						</Badge>
					)}
					<Link to="/submissions">
						<Button className="gap-2" variant="outline">
							<IconArrowLeft className="size-4" />
							Back to List
						</Button>
					</Link>
				</div>
			</PageHeader>

			<div className="flex-1 p-6 overflow-auto">
				<div className="mx-auto w-full max-w-7xl">
					<div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
						<div className="space-y-6">
							<ContentTabs
								authors={displayData.authors}
								content={displayData.content}
								file={displayData.file}
								keywords={displayData.keywords}
								statusHistory={statusHistory}
								title={displayData.title}
							/>

							{reviews.length > 0 && (
								<SubmissionReviewsSection
									reviews={reviews}
									versions={versions}
								/>
							)}

							{decision && (
								<EditorDecisionCard collapsible decision={decision} />
							)}
						</div>

						<div className="hidden lg:block">
							<div className="sticky top-0 space-y-4">
								<StatusCard status={submission.status} />
								<InfoCard
									onVersionChange={setSelectedVersion}
									selectedVersion={selectedVersion}
									submission={submission}
									versions={versions}
								/>
								{!isReadOnly && (
									<ActionsCard
										status={submission.status}
										submissionId={submission.id}
										submissionTitle={submission.title}
									/>
								)}
							</div>
						</div>

						<MobileSidebar
							isReadOnly={isReadOnly}
							onVersionChange={setSelectedVersion}
							selectedVersion={selectedVersion}
							submission={submission}
							versions={versions}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}

function NotFoundState({ id }: { id: string }) {
	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconFileText} title="Submission Not Found" />
			<div className="flex-1 p-6 flex items-center justify-center">
				<div className="text-center">
					<p className="text-muted-foreground mb-4">
						Submission with ID: {id} not found
					</p>
					<Link to="/submissions">
						<Button className="gap-2" variant="outline">
							<IconArrowLeft className="size-4" />
							Back to List
						</Button>
					</Link>
				</div>
			</div>
		</div>
	);
}
