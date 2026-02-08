import { IconArrowLeft, IconEye, IconFileText } from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import {
	ActionsCard,
	ContentTabs,
	InfoCard,
	MobileSidebar,
	StatusCard,
} from "@/components/submissions/detail";
import { EditorDecisionCard } from "@/components/submissions/editor-decision-card";
import { ReviewsSummaryCard } from "@/components/submissions/reviews-summary-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSubmissionByIdFn } from "@/utils/submissions.functions";

export const Route = createFileRoute("/_app/submissions/$id")({
	loader: async ({ params }) => {
		const data = await getSubmissionByIdFn({
			data: { submissionId: params.id },
		});
		return { data };
	},
	component: SubmissionDetailPage,
});

function SubmissionDetailPage() {
	const { id } = Route.useParams();
	const { data } = Route.useLoaderData();

	const [selectedVersion, setSelectedVersion] = useState(
		data?.submission.currentVersion ?? 1,
	);

	if (!data) {
		return <NotFoundState id={id} />;
	}

	const { submission, statusHistory, reviews, decision, versions } = data;
	const isReadOnly = submission.role === "coauthor";

	// Get version-specific data
	const versionData = versions.find((v) => v.version === selectedVersion);
	const displayData = {
		title: versionData?.title ?? submission.title,
		content: versionData?.content ?? submission.content,
		authors: versionData?.authors ?? submission.authors,
		keywords: versionData?.keywords ?? submission.keywords,
		file: versionData?.file ?? null,
	};

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconFileText} title="Submission Details">
				<div className="flex items-center gap-2">
					{isReadOnly && (
						<Badge variant="secondary" className="gap-1">
							<IconEye className="size-3" />
							Co-author (read-only)
						</Badge>
					)}
					<Link to="/submissions">
						<Button variant="outline" className="gap-2">
							<IconArrowLeft className="size-4" />
							Back to List
						</Button>
					</Link>
				</div>
			</PageHeader>

			<div className="flex-1 p-6 overflow-auto">
				<div className="mx-auto w-full max-w-7xl">
					<div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
						{/* Main Content */}
						<div className="space-y-6">
							<ContentTabs
								title={displayData.title}
								content={displayData.content}
								keywords={displayData.keywords}
								authors={displayData.authors}
								statusHistory={statusHistory}
								file={displayData.file}
							/>

							{reviews.length > 0 && (
								<ReviewsSummaryCard reviews={reviews} submissionId={id} />
							)}

							{decision && (
								<EditorDecisionCard decision={decision} collapsible />
							)}
						</div>

						{/* Desktop Sidebar */}
						<div className="hidden lg:block">
							<div className="sticky top-0 space-y-4">
								<StatusCard status={submission.status} />
								<InfoCard
									submission={submission}
									versions={versions}
									selectedVersion={selectedVersion}
									onVersionChange={setSelectedVersion}
								/>
								{!isReadOnly && (
									<ActionsCard
										submissionId={submission.id}
										status={submission.status}
									/>
								)}
							</div>
						</div>

						{/* Mobile Sidebar */}
						<MobileSidebar
							submission={submission}
							versions={versions}
							selectedVersion={selectedVersion}
							onVersionChange={setSelectedVersion}
							isReadOnly={isReadOnly}
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
						<Button variant="outline" className="gap-2">
							<IconArrowLeft className="size-4" />
							Back to List
						</Button>
					</Link>
				</div>
			</div>
		</div>
	);
}
