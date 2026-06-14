import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useDateFormat } from "@/hooks/use-date-format";
import { formatSurveyAnswerValue } from "@/lib/labels/survey";
import { formatSubmissionRole, roleLabels } from "@/lib/labels/user";
import type { AdminUser } from "@/lib/server/admin/users";
import { cn } from "@/shared/lib/utils";
import type { SurveyListColumn } from "./columns";

export function UserMobileCard({
	user,
	surveyColumns = [],
}: {
	user: AdminUser;
	surveyColumns?: SurveyListColumn[];
}) {
	const { formatDate } = useDateFormat();
	return (
		<Link to="/admin/users/$id" params={{ id: user.id }}>
			<Card>
				<CardContent className="p-4">
					<div className="flex items-start justify-between">
						<div>
							<p className="font-medium">
								{user.firstName} {user.lastName}
							</p>
							<p className="text-sm text-muted-foreground">{user.email}</p>
							{user.affiliation && (
								<p className="text-sm text-muted-foreground">
									{user.affiliation}
								</p>
							)}
							<p className="text-xs text-muted-foreground">
								Registered {formatDate(user.createdAt)}
							</p>
						</div>
						<div className="text-right">
							<Badge variant="secondary">{roleLabels[user.role]}</Badge>
							{user.fee?.paid ? (
								<p className="mt-1 text-xs text-green-600">Paid</p>
							) : (
								<p className="mt-1 text-xs text-red-600">Unpaid</p>
							)}
						</div>
					</div>
					{user.submissionRoles.length > 0 && (
						<div className="mt-3 flex flex-wrap gap-1">
							{user.submissionRoles.map((r) => (
								<Badge
									key={`${r.type}-${r.role}-${r.draft}`}
									variant="outline"
									className={cn(
										r.draft && "border-dashed text-muted-foreground",
									)}
								>
									{formatSubmissionRole(r)}
								</Badge>
							))}
						</div>
					)}
					{surveyColumns.length > 0 && (
						<div className="mt-3 space-y-1">
							{surveyColumns.map((col) => {
								const answer = user.surveyAnswers.find(
									(a) => a.questionId === col.id,
								);
								return (
									<p key={col.id} className="text-xs text-muted-foreground">
										<span className="font-medium">{col.header}:</span>{" "}
										{answer
											? formatSurveyAnswerValue(col.type, answer.value)
											: "—"}
									</p>
								);
							})}
						</div>
					)}
				</CardContent>
			</Card>
		</Link>
	);
}
