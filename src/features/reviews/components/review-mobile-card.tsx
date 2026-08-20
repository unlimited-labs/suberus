import {
	IconAlertTriangle,
	IconCircleCheck,
	IconClock,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { differenceInCalendarDays } from "date-fns";
import type { ReviewerAssignment } from "@/features/reviews/api/assignments";
import {
	assignmentStatusLabels,
	assignmentStatusVariants,
} from "@/features/reviews/labels";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { typeLabels } from "@/shared/lib/labels/submission";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { type DeadlineVariant, getDeadlineDisplay } from "./review-deadline";

const DEADLINE_PRESENTATION = {
	completed: {
		Icon: IconCircleCheck,
		iconClassName: "size-4 text-primary",
		textClassName: "text-sm text-muted-foreground",
	},
	overdue: {
		Icon: IconAlertTriangle,
		iconClassName: "size-4 text-destructive",
		textClassName: "text-sm font-semibold text-destructive",
	},
	urgent: {
		Icon: IconClock,
		iconClassName: "size-4 text-destructive animate-pulse",
		textClassName: "text-sm font-semibold text-destructive",
	},
	normal: {
		Icon: IconClock,
		iconClassName: "size-4 text-muted-foreground",
		textClassName: "text-sm text-muted-foreground",
	},
} satisfies Record<
	DeadlineVariant,
	{ Icon: typeof IconClock; iconClassName: string; textClassName: string }
>;

function DeadlineRow({ deadline, status }: { deadline: Date; status: string }) {
	const { formatDate } = useDateFormat();
	const daysRemaining = differenceInCalendarDays(deadline, new Date());
	const { variant, label } = getDeadlineDisplay(
		status,
		daysRemaining,
		formatDate(deadline),
	);
	const { Icon, iconClassName, textClassName } = DEADLINE_PRESENTATION[variant];
	return (
		<div className="flex items-center gap-2 pt-2 border-t border-border">
			<Icon className={iconClassName} />
			<span className={textClassName}>{label}</span>
		</div>
	);
}

function CardBadges({ assignment }: { assignment: ReviewerAssignment }) {
	return (
		<div className="flex items-center gap-2 flex-wrap">
			<Badge variant="outline" className="text-xs">
				{typeLabels[assignment.submissionType]}
			</Badge>
			<Badge
				variant={
					assignmentStatusVariants[
						// SAFETY: the table is keyed by this enum; the fallback covers an unrecognised key.
						assignment.status as keyof typeof assignmentStatusVariants
					] ?? "secondary"
				}
			>
				{assignmentStatusLabels[
					// SAFETY: the table is keyed by this enum; the fallback covers an unrecognised key.
					assignment.status as keyof typeof assignmentStatusLabels
				] ?? assignment.status}
			</Badge>
			{assignment.round > 1 && (
				<span className="text-xs text-muted-foreground">
					R{assignment.round}
				</span>
			)}
		</div>
	);
}

function CardAuthor({ assignment }: { assignment: ReviewerAssignment }) {
	if (assignment.authorName === "Anonymous Author") {
		return (
			<p className="text-sm italic text-muted-foreground">
				Double-blind review
			</p>
		);
	}
	return (
		<div className="text-sm">
			<p className="font-medium text-foreground">{assignment.authorName}</p>
			<p className="text-xs text-muted-foreground">
				{assignment.authorAffiliation}
			</p>
		</div>
	);
}

function CardAction({ id, status }: { id: string; status: string }) {
	if (status === "CANCELLED") return null;
	const isCompleted = status === "COMPLETED";
	return (
		<Button
			asChild
			variant={isCompleted ? "outline" : "default"}
			className="w-full"
			size="sm"
		>
			<Link to="/reviews/$assignmentId" params={{ assignmentId: id }}>
				{isCompleted ? "View Review" : "Submit Review"}
			</Link>
		</Button>
	);
}

export function ReviewMobileCard(assignment: ReviewerAssignment) {
	return (
		<Card className="overflow-hidden">
			<CardContent className="p-4">
				<div className="space-y-3">
					<p className="font-medium line-clamp-2">
						{assignment.submissionTitle}
					</p>
					<CardBadges assignment={assignment} />
					<CardAuthor assignment={assignment} />
					{assignment.deadline && (
						<DeadlineRow
							deadline={assignment.deadline}
							status={assignment.status}
						/>
					)}
					<CardAction id={assignment.id} status={assignment.status} />
				</div>
			</CardContent>
		</Card>
	);
}
