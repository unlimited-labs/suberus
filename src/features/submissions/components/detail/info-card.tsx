import { IconCalendar, IconCategory, IconRefresh } from "@tabler/icons-react";
import type {
	UserSubmission,
	UserSubmissionVersion,
} from "@/features/submissions/api/submissions";
import { VersionSelector } from "@/features/submissions/components/version-selector";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { SectionCard } from "@/shared/ui/section-card";
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
				<p className="text-muted-foreground text-xs">{label}</p>
				<p
					className={`text-foreground text-sm font-medium ${mono ? "font-mono" : ""}`}
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
		<SectionCard title="Information" variant="outlined">
			<div className="space-y-4">
				<InfoItem
					icon={<IconCategory className="text-muted-foreground size-4" />}
					label="Type"
					value={TYPE_LABELS[submission.type]}
				/>
				<InfoItem
					icon={<IconRefresh className="text-muted-foreground size-4" />}
					label="Review Round"
					value={submission.currentRound}
				/>

				{versions.length > 1 ? (
					<div className="border-border/50 border-t pt-2">
						<VersionSelector
							currentVersion={submission.currentVersion}
							onVersionChange={onVersionChange}
							selectedVersion={selectedVersion}
							versions={versions}
						/>
					</div>
				) : (
					<InfoItem label="Version" value={submission.currentVersion} />
				)}

				<div className="border-border/50 border-t pt-4">
					<InfoItem
						icon={<IconCalendar className="text-muted-foreground size-4" />}
						label="Submitted"
						value={formatDate(submission.createdAt)}
					/>
				</div>
				<InfoItem
					icon={<IconCalendar className="text-muted-foreground size-4" />}
					label="Last Modified"
					value={formatDate(submission.updatedAt)}
				/>
			</div>
		</SectionCard>
	);
}
