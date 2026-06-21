import { exhibitorStatusBadge } from "@/features/exhibitors/labels";
import type { ExhibitorStatus } from "@/generated/prisma/enums";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { Badge } from "@/shared/ui/badge";
import { SectionCard } from "@/shared/ui/section-card";

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
		<div data-testid="exhibitor-status">
			<SectionCard
				title="Application status"
				action={<Badge variant={badge.variant}>{badge.label}</Badge>}
				contentClassName="space-y-3"
			>
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
			</SectionCard>
		</div>
	);
}
