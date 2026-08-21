import type {
	UserSubmission,
	UserSubmissionVersion,
} from "@/features/submissions/api/submissions";
import { VersionSelector } from "@/features/submissions/components/version-selector";
import { ActionsCard } from "./actions-card";
import { TYPE_LABELS } from "./constants";
import { StatusCard } from "./status-card";

interface MobileSidebarProps {
	submission: UserSubmission;
	versions: UserSubmissionVersion[];
	selectedVersion: number;
	onVersionChange: (version: number) => void;
	isReadOnly?: boolean;
}

export function MobileSidebar({
	submission,
	versions,
	selectedVersion,
	onVersionChange,
	isReadOnly,
}: MobileSidebarProps) {
	return (
		<div className="space-y-6 lg:hidden" data-testid="submission-sidebar">
			<div className="bg-card border-border/50 rounded-2xl border p-6 shadow-xl">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<p className="text-muted-foreground mb-1 text-sm">Status</p>
						<StatusCard status={submission.status} variant="mobile" />
					</div>
					<div className="text-right">
						<p className="text-muted-foreground text-xs">
							{TYPE_LABELS[submission.type]} • Round {submission.currentRound}
						</p>
					</div>
				</div>
			</div>

			{versions.length > 1 && (
				<div className="bg-card border-border/50 rounded-2xl border p-6 shadow-xl">
					<VersionSelector
						currentVersion={submission.currentVersion}
						onVersionChange={onVersionChange}
						selectedVersion={selectedVersion}
						versions={versions}
					/>
				</div>
			)}

			{!isReadOnly && (
				<ActionsCard
					status={submission.status}
					submissionId={submission.id}
					submissionTitle={submission.title}
				/>
			)}
		</div>
	);
}
