import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExhibitorStatus } from "@/generated/prisma/enums";
import { exhibitorStatusBadge } from "@/lib/labels/exhibitor";
import { useDateFormat } from "@/shared/hooks/use-date-format";

interface ExhibitorStatusCardProps {
	status: ExhibitorStatus;
	appliedAt: Date | null;
	decidedAt: Date | null;
	packageName: string | null;
}

export function ExhibitorStatusCard({
	status,
	appliedAt,
	decidedAt,
	packageName,
}: ExhibitorStatusCardProps) {
	const { formatDate } = useDateFormat();
	const badge = exhibitorStatusBadge(status, appliedAt);

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
				{packageName && (
					<p
						className="text-sm text-muted-foreground"
						data-testid="exhibitor-package-display"
					>
						Package: <span className="text-foreground">{packageName}</span>
					</p>
				)}
			</CardContent>
		</Card>
	);
}
