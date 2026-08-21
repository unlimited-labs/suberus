import { Link } from "@tanstack/react-router";
import { formatSubmissionRole, roleLabels } from "@/features/users/labels";
import type { AdminUser } from "@/features/users/server/users";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";
import { UserFeeBadgeCell } from "./user-fee-badge-cell";

export function UserMobileCard({ user }: { user: AdminUser }) {
	return (
		<Card className="transition-colors">
			<CardContent className="flex flex-col gap-3 p-4">
				<Link
					className="block active:opacity-70"
					params={{ id: user.id }}
					to="/admin/users/$id"
				>
					<div className="flex items-start justify-between gap-3">
						<div className="min-w-0 flex-1">
							<p className="truncate leading-tight font-semibold">
								{user.firstName} {user.lastName}
							</p>
							<p className="text-muted-foreground truncate text-xs">
								{user.email}
							</p>
							{user.affiliation && (
								<p className="text-muted-foreground truncate text-xs">
									{user.affiliation}
								</p>
							)}
						</div>
						<Badge className="shrink-0" variant="secondary">
							{roleLabels[user.role]}
						</Badge>
					</div>
				</Link>

				<div className="flex flex-wrap items-center gap-1.5">
					<UserFeeBadgeCell mobile user={user} />
					{user.submissionRoles.map((r) => (
						<Badge
							className={cn(
								r.status === "draft" && "border-dashed text-muted-foreground",
								r.status === "accepted" && "border-green-600 text-green-600",
							)}
							key={`${r.type}-${r.role}-${r.status}`}
							variant="outline"
						>
							{formatSubmissionRole(r)}
						</Badge>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
