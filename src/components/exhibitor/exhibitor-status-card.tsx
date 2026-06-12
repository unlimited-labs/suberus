import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExhibitorStatus } from "@/generated/prisma/enums";
import { useDateFormat } from "@/hooks/use-date-format";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const decidedStatusBadges: Record<
	Exclude<ExhibitorStatus, "PENDING">,
	{ label: string; variant: BadgeVariant }
> = {
	APPROVED: { label: "Approved", variant: "default" },
	REJECTED: { label: "Not accepted", variant: "destructive" },
	WITHDRAWN: { label: "Withdrawn", variant: "outline" },
};

function statusBadge(
	status: ExhibitorStatus,
	appliedAt: Date | null,
): { label: string; variant: BadgeVariant } {
	if (status === "PENDING") {
		return appliedAt
			? { label: "Awaiting decision", variant: "secondary" }
			: { label: "Application not submitted", variant: "outline" };
	}
	return decidedStatusBadges[status];
}

interface ExhibitorStatusCardProps {
	status: ExhibitorStatus;
	appliedAt: Date | null;
	decidedAt: Date | null;
}

export function ExhibitorStatusCard({
	status,
	appliedAt,
	decidedAt,
}: ExhibitorStatusCardProps) {
	const { formatDate } = useDateFormat();
	const badge = statusBadge(status, appliedAt);

	return (
		<Card data-testid="exhibitor-status">
			<CardHeader>
				<CardTitle className="flex flex-wrap items-center justify-between gap-2">
					Application status
					<Badge variant={badge.variant}>{badge.label}</Badge>
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				{(appliedAt || decidedAt) && (
					<div className="flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:gap-6">
						{appliedAt && (
							<span>
								Submitted:{" "}
								<span className="text-foreground">
									{formatDate(new Date(appliedAt))}
								</span>
							</span>
						)}
						{decidedAt && (
							<span>
								Decided:{" "}
								<span className="text-foreground">
									{formatDate(new Date(decidedAt))}
								</span>
							</span>
						)}
					</div>
				)}
				{decidedAt && (
					<p className="text-sm text-muted-foreground">
						Your application has been decided. Any further changes are handled
						by the organizer — please contact them directly.
					</p>
				)}
				<p className="text-sm text-muted-foreground">
					The conference fee is handled on the{" "}
					<Link
						to="/fee"
						className="text-primary underline-offset-4 hover:underline"
					>
						Conference fee
					</Link>{" "}
					page.
				</p>
			</CardContent>
		</Card>
	);
}
