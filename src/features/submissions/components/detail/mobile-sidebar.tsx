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
		<div className="lg:hidden space-y-6" data-testid="submission-sidebar">
			<div className="rounded-2xl bg-card shadow-xl border border-border/50 p-6">
				<div className="flex items-center justify-between flex-wrap gap-3">
					<div>
						<p className="text-sm text-muted-foreground mb-1">Status</p>
						<StatusCard status={submission.status} variant="mobile" />
					</div>
					<div className="text-right">
						<p className="text-xs text-muted-foreground">
							{TYPE_LABELS[submission.type]} • Round {submission.currentRound}
						</p>
					</div>
				</div>
			</div>

			{versions.length > 1 && (
				<div className="rounded-2xl bg-card shadow-xl border border-border/50 p-6">
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
