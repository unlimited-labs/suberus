import {
	IconCoins,
	IconFileStack,
	IconMessageCircle,
	IconUsers,
} from "@tabler/icons-react";
import type { AdminDashboardMetrics } from "@/features/dashboard/server/admin-dashboard";
import { Skeleton } from "@/shared/ui/skeleton";
import { MetricSparkline } from "./metric-sparkline";

interface MetricsGridProps {
	metrics: AdminDashboardMetrics | undefined;
	isLoading: boolean;
}

export function MetricsGrid({ metrics, isLoading }: MetricsGridProps) {
	if (isLoading || !metrics) {
		return (
			<div
				className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
				data-testid="metrics-grid"
			>
				{Array.from({ length: 4 }).map((_, i) => (
					<MetricCardSkeleton key={i} />
				))}
			</div>
		);
	}

	const { users, submissions, reviews, fees, trends } = metrics;

	return (
		<div
			className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
			data-testid="metrics-grid"
		>
			<MetricCard
				icon={IconUsers}
				subtitle={`${users.verified} verified, ${users.recentSignups} recent`}
				title="Total Users"
				trend={trends.users}
				trendColor="#3b82f6"
				value={users.total}
			/>
			<MetricCard
				icon={IconFileStack}
				subtitle={`${submissions.recentCount} in last 7 days`}
				title="Total Submissions"
				trend={trends.submissions}
				trendColor="#8b5cf6"
				value={submissions.total}
			/>
			<MetricCard
				icon={IconMessageCircle}
				subtitle={`${reviews.completionRate.toFixed(0)}% completion rate`}
				title="Pending Reviews"
				trend={trends.reviewsCompleted}
				trendColor="#f59e0b"
				value={reviews.byStatus.PENDING}
			/>
			<MetricCard
				icon={IconCoins}
				subtitle={`${fees.paidCount} / ${fees.paidCount + fees.unpaidCount} paid`}
				title="Fees Collected"
				trend={trends.feesCollected}
				trendColor="#22c55e"
				value={`${fees.totalCollected.toFixed(0)} ${fees.currency}`}
			/>
		</div>
	);
}

interface MetricCardProps {
	icon: React.ComponentType<{ className?: string }>;
	title: string;
	value: number | string;
	subtitle: string;
	trend?: number[];
	trendColor?: string;
}

function MetricCard({
	icon: Icon,
	title,
	value,
	subtitle,
	trend,
	trendColor = "#3b82f6",
}: MetricCardProps) {
	return (
		<div
			className="border-border bg-card relative overflow-hidden rounded-lg border p-4"
			data-testid="metric-card"
		>
			{trend && trend.length > 0 && (
				<MetricSparkline color={trendColor} data={trend} />
			)}
			<div className="relative">
				<div className="mb-2 flex items-center gap-2">
					<Icon className="text-muted-foreground size-4" />
					<p className="text-muted-foreground text-sm">{title}</p>
				</div>
				<p className="text-2xl font-semibold" data-testid="metric-value">
					{value}
				</p>
				<p className="text-muted-foreground mt-1 text-xs">{subtitle}</p>
			</div>
		</div>
	);
}

function MetricCardSkeleton() {
	return (
		<div className="border-border bg-card rounded-lg border p-4">
			<div className="mb-2 flex items-center gap-2">
				<Skeleton className="size-4" />
				<Skeleton className="h-4 w-24" />
			</div>
			<Skeleton className="mb-1 h-8 w-16" />
			<Skeleton className="h-3 w-32" />
		</div>
	);
}
