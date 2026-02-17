import { IconCalendar, IconCategory, IconRefresh } from "@tabler/icons-react";
import { VersionSelector } from "@/components/submissions/version-selector";
import { useDateFormat } from "@/hooks/use-date-format";
import type {
	UserSubmission,
	UserSubmissionVersion,
} from "@/utils/submissions.functions";
import { TYPE_LABELS } from "./constants";

interface InfoItemProps {
	icon?: React.ReactNode;
	label: string;
	value: React.ReactNode;
	mono?: boolean;
}

function InfoItem({ icon, label, value, mono }: InfoItemProps) {
	return (
		<div className="flex items-center gap-3">
			{icon ?? <div className="size-4" />}
			<div>
				<p className="text-xs text-muted-foreground">{label}</p>
				<p
					className={`text-sm font-medium text-foreground ${mono ? "font-mono" : ""}`}
				>
					{value}
				</p>
			</div>
		</div>
	);
}

interface InfoCardProps {
	submission: UserSubmission;
	versions: UserSubmissionVersion[];
	selectedVersion: number;
	onVersionChange: (version: number) => void;
}

export function InfoCard({
	submission,
	versions,
	selectedVersion,
	onVersionChange,
}: InfoCardProps) {
	const { formatDate } = useDateFormat();

	return (
		<div className="rounded-2xl bg-card shadow-xl p-6 border border-border/50">
			<h3 className="font-semibold text-foreground mb-4">Information</h3>
			<div className="space-y-4">
				<InfoItem
					icon={<IconCategory className="size-4 text-muted-foreground" />}
					label="Type"
					value={TYPE_LABELS[submission.type]}
				/>
				<InfoItem
					icon={<IconRefresh className="size-4 text-muted-foreground" />}
					label="Review Round"
					value={submission.currentRound}
				/>

				{versions.length > 1 ? (
					<div className="pt-2 border-t">
						<VersionSelector
							versions={versions}
							currentVersion={submission.currentVersion}
							selectedVersion={selectedVersion}
							onVersionChange={onVersionChange}
						/>
					</div>
				) : (
					<InfoItem label="Version" value={submission.currentVersion} />
				)}

				<div className="border-t pt-4">
					<InfoItem
						icon={<IconCalendar className="size-4 text-muted-foreground" />}
						label="Submitted"
						value={formatDate(submission.createdAt)}
					/>
				</div>
				<InfoItem
					icon={<IconCalendar className="size-4 text-muted-foreground" />}
					label="Last Modified"
					value={formatDate(submission.updatedAt)}
				/>
			</div>
		</div>
	);
}
