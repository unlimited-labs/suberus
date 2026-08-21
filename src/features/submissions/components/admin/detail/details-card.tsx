import {
	IconCalendar,
	IconCircleDot,
	IconRepeat,
	IconRoute,
	IconUserCircle,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { updateSubmissionTrackFn } from "@/features/submissions/api/admin-submissions";
import { statusLabels, statusVariants } from "@/features/submissions/labels";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { Badge } from "@/shared/ui/badge";
import { SectionCard } from "@/shared/ui/section-card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";
import type { EditorSubmission, EditorSubmissionData } from "./availability";

interface DetailsCardProps {
	submission: Pick<
		EditorSubmission,
		"id" | "status" | "currentRound" | "createdAt" | "type" | "trackId"
	>;
	submitter: EditorSubmissionData["submitter"];
	availableTracks: { id: string; name: string }[];
	onTrackUpdated: () => void;
}

export function DetailsCard({
	submission,
	submitter,
	availableTracks,
	onTrackUpdated,
}: DetailsCardProps) {
	const { formatDate } = useDateFormat();

	return (
		<SectionCard contentClassName="space-y-3 text-sm" title="Details">
			<div className="flex items-center justify-between gap-2">
				<span className="text-muted-foreground flex items-center gap-1.5">
					<IconCircleDot className="size-4" />
					Status
				</span>
				<Badge
					className="-mr-2"
					data-testid="submission-status"
					variant={statusVariants[submission.status] ?? "secondary"}
				>
					{statusLabels[submission.status] ?? submission.status}
				</Badge>
			</div>
			<div className="flex items-center justify-between gap-2">
				<span className="text-muted-foreground flex items-center gap-1.5">
					<IconRepeat className="size-4" />
					Round
				</span>
				<span className="font-medium">{submission.currentRound}</span>
			</div>
			<div className="flex items-center justify-between gap-2">
				<span className="text-muted-foreground flex items-center gap-1.5">
					<IconCalendar className="size-4" />
					Submitted
				</span>
				<span className="font-medium">{formatDate(submission.createdAt)}</span>
			</div>
			<div className="flex items-center justify-between gap-2">
				<span className="text-muted-foreground flex items-center gap-1.5">
					<IconUserCircle className="size-4" />
					Submitter
				</span>
				<Link
					className="hover:text-primary flex items-center gap-1 font-medium hover:underline"
					data-testid="submission-submitter-link"
					params={{ id: submitter.id }}
					to="/admin/users/$id"
				>
					{`${submitter.firstName ?? ""} ${submitter.lastName ?? ""}`.trim() ||
						"—"}
				</Link>
			</div>

			{submission.type === "ABSTRACT" && (
				<div className="border-t pt-3">
					<p className="text-muted-foreground mb-1.5 flex items-center gap-1.5">
						<IconRoute className="size-4" />
						Track
					</p>
					<Select
						items={[
							{ value: "none", label: "None" },
							...availableTracks.map((s) => ({ value: s.id, label: s.name })),
						]}
						onValueChange={async (value) => {
							try {
								await updateSubmissionTrackFn({
									data: {
										submissionId: submission.id,
										trackId: value === "none" ? null : value,
									},
								});
								toast.success("Track updated");
								onTrackUpdated();
							} catch {
								toast.error("Failed to update track");
							}
						}}
						value={submission.trackId || "none"}
					>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="No track" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="none">None</SelectItem>
							{availableTracks.map((s) => (
								<SelectItem key={s.id} value={s.id}>
									{s.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			)}
		</SectionCard>
	);
}
