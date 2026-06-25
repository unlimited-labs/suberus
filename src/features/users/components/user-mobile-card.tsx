import { Link } from "@tanstack/react-router";
import { formatSubmissionRole, roleLabels } from "@/features/users/labels";
import type { AdminUser } from "@/features/users/server/users";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";

export function UserMobileCard({ user }: { user: AdminUser }) {
	return (
		<Link to="/admin/users/$id" params={{ id: user.id }} className="block">
			<Card className="transition-colors active:bg-accent">
				<CardContent className="flex flex-col gap-3 p-4">
					<div className="flex items-start justify-between gap-3">
						<div className="min-w-0 flex-1">
							<p className="truncate font-semibold leading-tight">
								{user.firstName} {user.lastName}
							</p>
							<p className="truncate text-xs text-muted-foreground">
								{user.email}
							</p>
							{user.affiliation && (
								<p className="truncate text-xs text-muted-foreground">
									{user.affiliation}
								</p>
							)}
						</div>
						<Badge variant="secondary" className="shrink-0">
							{roleLabels[user.role]}
						</Badge>
					</div>

					<div className="flex flex-wrap items-center gap-1.5">
						<Badge
							variant="outline"
							className={cn(
								user.fee?.paid
									? "border-green-600 text-green-600"
									: "border-red-600 text-red-600",
							)}
						>
							{user.fee?.paid ? "Paid" : "Unpaid"}
						</Badge>
						{user.submissionRoles.map((r) => (
							<Badge
								key={`${r.type}-${r.role}-${r.status}`}
								variant="outline"
								className={cn(
									r.status === "draft" && "border-dashed text-muted-foreground",
									r.status === "accepted" && "border-green-600 text-green-600",
								)}
							>
								{formatSubmissionRole(r)}
							</Badge>
						))}
					</div>
				</CardContent>
			</Card>
		</Link>
	);
}
