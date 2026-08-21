import { Link } from "@tanstack/react-router";
import type { UserSubmission } from "@/features/submissions/api/submissions";
import type {
	SubmissionStatus,
	SubmissionType,
} from "@/generated/prisma/enums";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";

interface SubmissionsTableProps {
	submissions: UserSubmission[];
}

const statusColors = {
	DRAFT: "outline",
	SUBMITTED: "default",
	UNDER_REVIEW: "secondary",
	REVIEWS_COMPLETE: "secondary",
	AWAITING_DECISION: "secondary",
	REVISE_REQUIRED: "outline",
	RESUBMITTED: "default",
	ACCEPTED: "default",
	CONDITIONALLY_ACCEPTED: "default",
	REJECTED: "destructive",
	WITHDRAWN: "outline",
} satisfies Record<
	SubmissionStatus,
	"default" | "secondary" | "destructive" | "outline"
>;

const statusLabels = {
	DRAFT: "Draft",
	SUBMITTED: "Submitted",
	UNDER_REVIEW: "Under Review",
	REVIEWS_COMPLETE: "Reviews Complete",
	AWAITING_DECISION: "Awaiting Decision",
	REVISE_REQUIRED: "Revisions Required",
	RESUBMITTED: "Resubmitted",
	ACCEPTED: "Accepted",
	CONDITIONALLY_ACCEPTED: "Conditionally Accepted",
	REJECTED: "Rejected",
	WITHDRAWN: "Withdrawn",
} satisfies Record<SubmissionStatus, string>;

const typeLabels = {
	ABSTRACT: "Abstract",
	FULL_PAPER: "Full Paper",
	POSTER: "Poster",
	EXHIBITOR: "Exhibitor",
	INVITED: "Invited Talk",
} satisfies Record<SubmissionType, string>;

function CoAuthorBadge({ role }: { role: UserSubmission["role"] }) {
	if (role !== "coauthor") return null;
	return <Badge variant="outline">Co-author</Badge>;
}

export function SubmissionsTable({ submissions }: SubmissionsTableProps) {
	const { formatDate } = useDateFormat();

	return (
		<>
			<div className="border-border/50 hidden rounded-md border md:block">
				<div className="relative w-full overflow-auto">
					<table className="w-full caption-bottom text-sm">
						<thead className="[&_tr]:border-b">
							<tr className="border-b">
								<th className="text-muted-foreground h-10 px-2 text-left align-middle font-medium">
									Title
								</th>
								<th className="text-muted-foreground h-10 px-2 text-left align-middle font-medium">
									Type
								</th>
								<th className="text-muted-foreground h-10 px-2 text-left align-middle font-medium">
									Status
								</th>
								<th className="text-muted-foreground h-10 px-2 text-left align-middle font-medium">
									Round
								</th>
								<th className="text-muted-foreground h-10 px-2 text-left align-middle font-medium">
									Version
								</th>
								<th className="text-muted-foreground h-10 px-2 text-left align-middle font-medium">
									Submitted
								</th>
								<th className="text-muted-foreground h-10 px-2 text-left align-middle font-medium">
									Last Modified
								</th>
							</tr>
						</thead>
						<tbody className="[&_tr:last-child]:border-0">
							{submissions.map((submission) => (
								<tr
									className="hover:bg-muted/50 border-b transition-colors"
									key={submission.id}
								>
									<td className="p-2 align-middle">
										<div className="flex items-center gap-2">
											<Link
												className="text-foreground hover:text-primary line-clamp-2 font-medium"
												params={{ id: submission.id }}
												to="/submissions/$id"
											>
												{submission.title}
											</Link>
											<CoAuthorBadge role={submission.role} />
										</div>
									</td>
									<td className="p-2 align-middle whitespace-nowrap">
										<span className="text-muted-foreground">
											{typeLabels[submission.type]}
										</span>
									</td>
									<td className="p-2 align-middle whitespace-nowrap">
										<Badge variant={statusColors[submission.status]}>
											{statusLabels[submission.status]}
										</Badge>
									</td>
									<td className="p-2 text-center align-middle whitespace-nowrap">
										<span className="text-muted-foreground">
											{submission.currentRound}
										</span>
									</td>
									<td className="p-2 text-center align-middle whitespace-nowrap">
										<span className="text-muted-foreground">
											{submission.currentVersion}
										</span>
									</td>
									<td className="p-2 align-middle whitespace-nowrap">
										<span className="text-muted-foreground">
											{formatDate(submission.createdAt)}
										</span>
									</td>
									<td className="p-2 align-middle whitespace-nowrap">
										<span className="text-muted-foreground">
											{formatDate(submission.updatedAt)}
										</span>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			<div
				className="space-y-3 md:hidden"
				data-testid="mobile-submissions-cards"
			>
				{submissions.map((submission) => (
					<Link
						className="block"
						key={submission.id}
						params={{ id: submission.id }}
						to="/submissions/$id"
					>
						<Card>
							<CardContent className="p-4">
								<div className="space-y-2">
									<p className="line-clamp-2 font-medium">{submission.title}</p>
									<div className="flex flex-wrap items-center gap-2">
										<Badge variant={statusColors[submission.status]}>
											{statusLabels[submission.status]}
										</Badge>
										<Badge variant="outline">
											{typeLabels[submission.type]}
										</Badge>
										<CoAuthorBadge role={submission.role} />
										<span className="text-muted-foreground text-xs">
											R{submission.currentRound} · v{submission.currentVersion}
										</span>
									</div>
									<p className="text-muted-foreground text-sm">
										{formatDate(submission.updatedAt)}
									</p>
								</div>
							</CardContent>
						</Card>
					</Link>
				))}
			</div>
		</>
	);
}
