import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { IconFileText, IconArrowLeft } from "@tabler/icons-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ReviewsSummaryCard } from "@/components/submissions/reviews-summary-card";
import { EditorDecisionCard } from "@/components/submissions/editor-decision-card";
import {
	ContentTabs,
	StatusCard,
	InfoCard,
	ActionsCard,
	MobileSidebar,
} from "@/components/submissions/detail";
import {
	getSubmissionById,
	getStatusHistoryForSubmission,
	getReviewsForSubmission,
	getEditorDecisionForSubmission,
	getVersionsForSubmission,
	getVersionByNumber,
} from "@/lib/mock-data/submissions";

export const Route = createFileRoute("/_app/submissions/$id")({
	component: SubmissionDetailPage,
});

function SubmissionDetailPage() {
	const { id } = Route.useParams();

	const submission = getSubmissionById(id);
	const statusHistory = getStatusHistoryForSubmission(id);
	const reviews = getReviewsForSubmission(id);
	const decision = getEditorDecisionForSubmission(id);
	const versions = getVersionsForSubmission(id);

	const [selectedVersion, setSelectedVersion] = useState(
		submission?.currentVersion ?? 1,
	);

	if (!submission) {
		return <NotFoundState id={id} />;
	}

	// Get version-specific data
	const versionData = getVersionByNumber(id, selectedVersion);
	const displayData = {
		title: versionData?.title ?? submission.title,
		content: versionData?.content ?? submission.content,
		authors: versionData?.authors ?? submission.authors,
		keywords: versionData?.keywords ?? submission.keywords,
	};

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconFileText} title="Szczegóły zgłoszenia">
				<Link to="/submissions">
					<Button variant="outline" className="gap-2">
						<IconArrowLeft className="size-4" />
						Powrót do listy
					</Button>
				</Link>
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
								<ActionsCard
									submissionId={submission.id}
									status={submission.status}
								/>
							</div>
						</div>

						{/* Mobile Sidebar */}
						<MobileSidebar
							submission={submission}
							versions={versions}
							selectedVersion={selectedVersion}
							onVersionChange={setSelectedVersion}
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
			<PageHeader icon={IconFileText} title="Zgłoszenie nie znalezione" />
			<div className="flex-1 p-6 flex items-center justify-center">
				<div className="text-center">
					<p className="text-muted-foreground mb-4">
						Nie znaleziono zgłoszenia o ID: {id}
					</p>
					<Link to="/submissions">
						<Button variant="outline" className="gap-2">
							<IconArrowLeft className="size-4" />
							Powrót do listy
						</Button>
					</Link>
				</div>
			</div>
		</div>
	);
}
