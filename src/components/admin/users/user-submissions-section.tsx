import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import {
	statusLabels,
	statusVariants,
	typeLabels,
} from "@/features/submissions/labels";
import { useDateFormat } from "@/hooks/use-date-format";
import type { AdminUserSubmission } from "@/lib/server/admin/users";

interface UserSubmissionsSectionProps {
	submissions: AdminUserSubmission[];
}

export function UserSubmissionsSection({
	submissions,
}: UserSubmissionsSectionProps) {
	const { formatDate } = useDateFormat();

	return (
		<div className="space-y-3">
			<h3 className="text-sm font-medium text-muted-foreground">Submissions</h3>
			{submissions.length === 0 ? (
				<p className="text-sm text-muted-foreground">No submissions</p>
			) : (
				<ul className="space-y-2">
					{submissions.map((s) => (
						<li
							key={s.id}
							data-testid="user-submission-row"
							className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
						>
							<div className="flex min-w-0 items-start gap-2">
								<span className="font-mono text-sm text-muted-foreground">
									{s.sequentialNumber}
								</span>
								<Link
									to="/admin/submissions/$id"
									params={{ id: s.id }}
									className="line-clamp-2 font-medium text-foreground hover:underline"
								>
									{s.title}
								</Link>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								<Badge variant="outline">{typeLabels[s.type]}</Badge>
								<Badge variant={statusVariants[s.status]}>
									{statusLabels[s.status]}
								</Badge>
								<Badge variant="secondary">
									{s.role === "author" ? "Author" : "Co-author"}
								</Badge>
								<span className="text-xs text-muted-foreground">
									{formatDate(s.updatedAt)}
								</span>
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
