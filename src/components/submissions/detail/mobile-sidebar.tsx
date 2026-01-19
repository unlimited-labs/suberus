import { VersionSelector } from "@/components/submissions/version-selector";
import { StatusCard } from "./status-card";
import { ActionsCard } from "./actions-card";
import { TYPE_LABELS } from "./constants";
import type { MockSubmission, MockVersion } from "@/lib/mock-data/submissions";

interface MobileSidebarProps {
	submission: MockSubmission;
	versions: MockVersion[];
	selectedVersion: number;
	onVersionChange: (version: number) => void;
}

export function MobileSidebar({
	submission,
	versions,
	selectedVersion,
	onVersionChange,
}: MobileSidebarProps) {
	return (
		<div className="lg:hidden space-y-6">
			{/* Mobile Status */}
			<div className="rounded-2xl bg-card shadow-xl border p-6">
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
				<div className="rounded-2xl bg-card shadow-xl border p-6">
					<VersionSelector
						versions={versions}
						currentVersion={submission.currentVersion}
						selectedVersion={selectedVersion}
						onVersionChange={onVersionChange}
					/>
				</div>
			)}

			{/* Mobile Actions */}
			<ActionsCard submissionId={submission.id} status={submission.status} />
		</div>
	);
}
