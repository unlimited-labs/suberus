import { lazy, Suspense } from "react";
import type { AdminDashboardMetrics } from "@/features/dashboard/server/admin-dashboard";
import { Badge } from "@/shared/ui/badge";
import { Progress } from "@/shared/ui/progress";
import { SectionCard } from "@/shared/ui/section-card";

const ReviewCompletionPie = lazy(() =>
	import("./charts").then((m) => ({ default: m.ReviewCompletionPie })),
);

interface ReviewProgressProps {
	data: AdminDashboardMetrics["reviews"] | undefined;
}

export function ReviewProgress({ data }: ReviewProgressProps) {
	if (!data) {
		return (
			<SectionCard title="Review Progress">
				<div className="flex h-[300px] items-center justify-center">
					<p className="text-muted-foreground">Loading...</p>
				</div>
			</SectionCard>
		);
	}

	const { byStatus, completionRate, totalAssignments } = data;

	return (
		<SectionCard title="Review Progress" contentClassName="space-y-4">
			<div className="flex items-center justify-center">
				<Suspense fallback={<div className="h-[150px] w-1/2" />}>
					<ReviewCompletionPie
						completed={byStatus.COMPLETED}
						total={totalAssignments}
					/>
				</Suspense>
				<div className="text-center ml-4">
					<p className="text-3xl font-bold">{completionRate.toFixed(0)}%</p>
					<p className="text-sm text-muted-foreground">Completion Rate</p>
				</div>
			</div>

			<Progress value={completionRate} className="h-2" />

			<div className="grid grid-cols-2 gap-4 pt-2">
				<div className="text-center">
					<p className="text-2xl font-semibold">{byStatus.PENDING}</p>
					<p className="text-xs text-muted-foreground">Pending</p>
				</div>
				<div className="text-center">
					<p className="text-2xl font-semibold">{byStatus.COMPLETED}</p>
					<p className="text-xs text-muted-foreground">Completed</p>
				</div>
			</div>

			{byStatus.OVERDUE > 0 && (
				<div className="flex justify-center pt-2">
					<Badge variant="destructive">{byStatus.OVERDUE} Overdue</Badge>
				</div>
			)}
		</SectionCard>
	);
}
