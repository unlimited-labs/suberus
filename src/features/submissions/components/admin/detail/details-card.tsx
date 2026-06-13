import {
	IconCalendar,
	IconCircleDot,
	IconRepeat,
	IconRoute,
	IconUserCircle,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { updateSubmissionTrackFn } from "@/features/submissions/api/admin-submissions";
import { statusLabels, statusVariants } from "@/features/submissions/labels";
import { useDateFormat } from "@/hooks/use-date-format";

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
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Details</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3 text-sm">
				<div className="flex items-center justify-between gap-2">
					<span className="flex items-center gap-1.5 text-muted-foreground">
						<IconCircleDot className="size-4" />
						Status
					</span>
					<Badge
						data-testid="submission-status"
						variant={statusVariants[submission.status] ?? "secondary"}
						className="-mr-2"
					>
						{statusLabels[submission.status] ?? submission.status}
					</Badge>
				</div>
				<div className="flex items-center justify-between gap-2">
					<span className="flex items-center gap-1.5 text-muted-foreground">
						<IconRepeat className="size-4" />
						Round
					</span>
					<span className="font-medium">{submission.currentRound}</span>
				</div>
				<div className="flex items-center justify-between gap-2">
					<span className="flex items-center gap-1.5 text-muted-foreground">
						<IconCalendar className="size-4" />
						Submitted
					</span>
					<span className="font-medium">
						{formatDate(submission.createdAt)}
					</span>
				</div>
				<div className="flex items-center justify-between gap-2">
					<span className="flex items-center gap-1.5 text-muted-foreground">
						<IconUserCircle className="size-4" />
						Submitter
					</span>
					<Link
						to="/admin/users/$id"
						params={{ id: submitter.id }}
						data-testid="submission-submitter-link"
						className="flex items-center gap-1 font-medium hover:text-primary hover:underline"
					>
						{`${submitter.firstName ?? ""} ${submitter.lastName ?? ""}`.trim() ||
							"—"}
					</Link>
				</div>

				{submission.type === "ABSTRACT" && (
					<div className="border-t pt-3">
						<p className="mb-1.5 flex items-center gap-1.5 text-muted-foreground">
							<IconRoute className="size-4" />
							Track
						</p>
						<Select
							value={submission.trackId || "none"}
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
			</CardContent>
		</Card>
	);
}
