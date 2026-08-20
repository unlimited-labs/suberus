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
} satisfies Record<SubmissionType, string>;

function CoAuthorBadge({ role }: { role: UserSubmission["role"] }) {
	if (role !== "coauthor") return null;
	return <Badge variant="outline">Co-author</Badge>;
}

export function SubmissionsTable({ submissions }: SubmissionsTableProps) {
	const { formatDate } = useDateFormat();

	return (
		<>
			<div className="hidden md:block rounded-md border border-border/50">
				<div className="relative w-full overflow-auto">
					<table className="w-full caption-bottom text-sm">
						<thead className="[&_tr]:border-b">
							<tr className="border-b">
								<th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">
									Title
								</th>
								<th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">
									Type
								</th>
								<th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">
									Status
								</th>
								<th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">
									Round
								</th>
								<th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">
									Version
								</th>
								<th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">
									Submitted
								</th>
								<th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">
									Last Modified
								</th>
							</tr>
						</thead>
						<tbody className="[&_tr:last-child]:border-0">
							{submissions.map((submission) => (
								<tr
									key={submission.id}
									className="border-b transition-colors hover:bg-muted/50"
								>
									<td className="p-2 align-middle">
										<div className="flex items-center gap-2">
											<Link
												to="/submissions/$id"
												params={{ id: submission.id }}
												className="font-medium text-foreground hover:text-primary line-clamp-2"
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
									<td className="p-2 align-middle whitespace-nowrap text-center">
										<span className="text-muted-foreground">
											{submission.currentRound}
										</span>
									</td>
									<td className="p-2 align-middle whitespace-nowrap text-center">
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
				className="md:hidden space-y-3"
				data-testid="mobile-submissions-cards"
			>
				{submissions.map((submission) => (
					<Link
						key={submission.id}
						to="/submissions/$id"
						params={{ id: submission.id }}
						className="block"
					>
						<Card>
							<CardContent className="p-4">
								<div className="space-y-2">
									<p className="font-medium line-clamp-2">{submission.title}</p>
									<div className="flex items-center gap-2 flex-wrap">
										<Badge variant={statusColors[submission.status]}>
											{statusLabels[submission.status]}
										</Badge>
										<Badge variant="outline">
											{typeLabels[submission.type]}
										</Badge>
										<CoAuthorBadge role={submission.role} />
										<span className="text-xs text-muted-foreground">
											R{submission.currentRound} · v{submission.currentVersion}
										</span>
									</div>
									<p className="text-sm text-muted-foreground">
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
