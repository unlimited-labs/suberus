import { exhibitorStatusBadge } from "@/features/exhibitors/labels";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { SectionCard } from "@/shared/ui/section-card";
import type { ExhibitorDetail } from "./types";

interface ExhibitorDecisionCardProps {
	exhibitor: ExhibitorDetail;
	onApprove: () => void;
	onReject: () => void;
}

export function ExhibitorDecisionCard({
	exhibitor,
	onApprove,
	onReject,
}: ExhibitorDecisionCardProps) {
	const { formatDate } = useDateFormat();
	const badge = exhibitorStatusBadge(exhibitor.status, exhibitor.appliedAt);
	const canDecide = exhibitor.status === "PENDING" && !!exhibitor.appliedAt;
	const deciderName = exhibitor.decidedBy
		? `${exhibitor.decidedBy.firstName ?? ""} ${exhibitor.decidedBy.lastName ?? ""}`.trim()
		: null;

	return (
		<div data-testid="exhibitor-decision">
			<SectionCard title="Decision" contentClassName="space-y-3 text-sm">
				{canDecide ? (
					<div className="flex flex-col gap-2 sm:flex-row">
						<Button data-testid="exhibitor-approve" onClick={onApprove}>
							Approve
						</Button>
						<Button
							data-testid="exhibitor-reject"
							variant="destructive"
							onClick={onReject}
						>
							Reject
						</Button>
					</div>
				) : exhibitor.status === "PENDING" ? (
					<p className="text-muted-foreground">
						Application not completed — no decision possible
					</p>
				) : (
					<div className="space-y-2">
						<Badge variant={badge.variant}>{badge.label}</Badge>
						{exhibitor.decidedAt && (
							<p className="text-muted-foreground">
								Decided
								{deciderName ? ` by ${deciderName}` : ""} on{" "}
								{formatDate(new Date(exhibitor.decidedAt))}
							</p>
						)}
					</div>
				)}
			</SectionCard>
		</div>
	);
}
