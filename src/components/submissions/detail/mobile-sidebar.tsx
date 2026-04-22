import { VersionSelector } from "@/components/submissions/version-selector";
import type {
	UserSubmission,
	UserSubmissionVersion,
} from "@/server-fns/submissions";
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
		<div data-testid="submission-sidebar" className="lg:hidden space-y-6">
			{/* Mobile Status */}
			<div className="rounded-2xl bg-card shadow-xl border border-border/50 p-6">
				<div className="flex items-center justify-between flex-wrap gap-3">
					<div>
						<p className="text-sm text-muted-foreground mb-1">Status</p>
						<StatusCard status={submission.status} variant="mobile" />
					</div>
					<div className="text-right">
						<p className="text-xs text-muted-foreground">
							{TYPE_LABELS[submission.type]} • Runda {submission.currentRound}
						</p>
						<p className="text-xs text-muted-foreground">{submission.id}</p>
					</div>
				</div>
			</div>

			{/* Mobile Version Selector */}
			{versions.length > 1 && (
				<div className="rounded-2xl bg-card shadow-xl border border-border/50 p-6">
					<VersionSelector
						versions={versions}
						currentVersion={submission.currentVersion}
						selectedVersion={selectedVersion}
						onVersionChange={onVersionChange}
					/>
				</div>
			)}

			{/* Mobile Actions */}
			{!isReadOnly && (
				<ActionsCard
					submissionId={submission.id}
					submissionTitle={submission.title}
					status={submission.status}
				/>
			)}
		</div>
	);
}
