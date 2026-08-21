import { Link } from "@tanstack/react-router";
import { exhibitorStatusBadge } from "@/features/exhibitors/labels";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";
import type { AdminExhibitorRow } from "./exhibitors-table";

export function ExhibitorMobileCard({
	exhibitor,
}: {
	exhibitor: AdminExhibitorRow;
}) {
	const { formatDate } = useDateFormat();
	const { firstName, lastName, email, fee } = exhibitor.user;
	const name = `${firstName ?? ""} ${lastName ?? ""}`.trim();
	const badge = exhibitorStatusBadge(exhibitor.status, exhibitor.appliedAt);

	return (
		<Link params={{ id: exhibitor.id }} to="/admin/exhibitors/$id">
			<Card className={cn(!exhibitor.appliedAt && "opacity-70")}>
				<CardContent className="p-4">
					<div className="flex items-start justify-between gap-2">
						<div>
							<p className="font-medium">{exhibitor.companyName || "—"}</p>
							<p className="text-muted-foreground text-sm">{name || email}</p>
							{name && <p className="text-muted-foreground text-xs">{email}</p>}
							<p className="text-muted-foreground mt-1 text-xs">
								{exhibitor.appliedAt
									? `Applied ${formatDate(new Date(exhibitor.appliedAt))}`
									: "Not applied yet"}
							</p>
						</div>
						<div className="flex flex-col items-end gap-1">
							<Badge variant={badge.variant}>{badge.label}</Badge>
							{fee?.paid ? (
								<p className="text-xs text-green-600">Fee paid</p>
							) : (
								<p className="text-muted-foreground text-xs">Fee unpaid</p>
							)}
						</div>
					</div>
					<p className="text-muted-foreground mt-3 text-sm">
						{exhibitor.submission
							? exhibitor.submission.title
							: "No presentation"}
					</p>
				</CardContent>
			</Card>
		</Link>
	);
}
