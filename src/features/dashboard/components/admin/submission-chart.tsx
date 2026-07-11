import { lazy, Suspense } from "react";
import type { AdminDashboardMetrics } from "@/features/dashboard/server/admin-dashboard";
import { SectionCard } from "@/shared/ui/section-card";

const SubmissionStatusPie = lazy(() =>
	import("./charts").then((m) => ({ default: m.SubmissionStatusPie })),
);

interface SubmissionChartProps {
	data: AdminDashboardMetrics["submissions"] | undefined;
}

const STATUS_LABELS: Record<string, string> = {
	ACCEPTED: "Accepted",
	CONDITIONALLY_ACCEPTED: "Cond. Accepted",
	REJECTED: "Rejected",
	UNDER_REVIEW: "Under Review",
	SUBMITTED: "Submitted",
	AWAITING_DECISION: "Awaiting Decision",
	REVIEWS_COMPLETE: "Reviews Complete",
	REVISE_REQUIRED: "Revise Required",
	RESUBMITTED: "Resubmitted",
	DRAFT: "Draft",
	WITHDRAWN: "Withdrawn",
};

export function SubmissionChart({ data }: SubmissionChartProps) {
	if (!data) {
		return (
			<SectionCard title="Submissions by Status">
				<div className="flex h-[300px] items-center justify-center">
					<p className="text-muted-foreground">Loading...</p>
				</div>
			</SectionCard>
		);
	}

	const chartData = Object.entries(data.byStatus)
		.filter(([_, value]) => value > 0)
		.map(([status, value]) => ({
			name: STATUS_LABELS[status] || status,
			value,
			status,
		}));

	if (chartData.length === 0) {
		return (
			<SectionCard title="Submissions by Status">
				<div className="flex h-[300px] items-center justify-center">
					<p className="text-muted-foreground">No submissions yet</p>
				</div>
			</SectionCard>
		);
	}

	const total = chartData.reduce((sum, item) => sum + item.value, 0);

	return (
		<SectionCard title="Submissions by Status">
			<Suspense fallback={<div className="h-[300px]" />}>
				<SubmissionStatusPie data={chartData} total={total} />
			</Suspense>
		</SectionCard>
	);
}
