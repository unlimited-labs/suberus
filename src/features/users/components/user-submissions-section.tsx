import { Link } from "@tanstack/react-router";
import type { AdminUserSubmission } from "@/features/users/server/users";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import {
	statusLabels,
	statusVariants,
	typeLabels,
} from "@/shared/lib/labels/submission";
import { Badge } from "@/shared/ui/badge";

interface UserSubmissionsSectionProps {
	submissions: AdminUserSubmission[];
}

export function UserSubmissionsSection({
	submissions,
}: UserSubmissionsSectionProps) {
	const { formatDate } = useDateFormat();

	return submissions.length === 0 ? (
		<p className="text-muted-foreground text-sm">No submissions</p>
	) : (
		<ul className="space-y-2">
			{submissions.map((s) => (
				<li
					className="flex flex-col gap-2 rounded-lg border p-3"
					data-testid="user-submission-row"
					key={s.id}
				>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="outline">{typeLabels[s.type]}</Badge>
						<Badge variant={statusVariants[s.status]}>
							{statusLabels[s.status]}
						</Badge>
						<Badge variant="secondary">
							{s.role === "author" ? "Author" : "Co-author"}
						</Badge>
					</div>
					<div className="flex min-w-0 items-start gap-2">
						<span className="text-muted-foreground font-mono text-sm">
							{s.sequentialNumber}
						</span>
						<Link
							className="text-foreground line-clamp-2 font-medium hover:underline"
							params={{ id: s.id }}
							to="/admin/submissions/$id"
						>
							{s.title}
						</Link>
					</div>
					<span className="text-muted-foreground self-end text-xs">
						{formatDate(s.updatedAt)}
					</span>
				</li>
			))}
		</ul>
	);
}
