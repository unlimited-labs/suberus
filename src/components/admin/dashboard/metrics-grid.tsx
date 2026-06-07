import {
	IconCoins,
	IconFileStack,
	IconMessageCircle,
	IconUsers,
} from "@tabler/icons-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminDashboardMetrics } from "@/lib/server/admin/dashboard";
import { MetricSparkline } from "./metric-sparkline";

interface MetricsGridProps {
	metrics: AdminDashboardMetrics | undefined;
	isLoading: boolean;
}

export function MetricsGrid({ metrics, isLoading }: MetricsGridProps) {
	if (isLoading || !metrics) {
		return (
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<MetricCardSkeleton key={i} />
				))}
			</div>
		);
	}

	const { users, submissions, reviews, fees, trends } = metrics;

	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			<MetricCard
				icon={IconUsers}
				title="Total Users"
				value={users.total}
				subtitle={`${users.verified} verified, ${users.recentSignups} recent`}
				trend={trends.users}
				trendColor="#3b82f6"
			/>
			<MetricCard
				icon={IconFileStack}
				title="Total Submissions"
				value={submissions.total}
				subtitle={`${submissions.recentCount} in last 7 days`}
				trend={trends.submissions}
				trendColor="#8b5cf6"
			/>
			<MetricCard
				icon={IconMessageCircle}
				title="Pending Reviews"
				value={reviews.byStatus.PENDING}
				subtitle={`${reviews.completionRate.toFixed(0)}% completion rate`}
				trend={trends.reviewsCompleted}
				trendColor="#f59e0b"
			/>
			<MetricCard
				icon={IconCoins}
				title="Fees Collected"
				value={`$${fees.totalCollected.toFixed(0)}`}
				subtitle={`${fees.paidCount} / ${fees.paidCount + fees.unpaidCount} paid`}
				trend={trends.feesCollected}
				trendColor="#22c55e"
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
		<div className="relative overflow-hidden rounded-lg border border-border bg-card p-4">
			{trend && trend.length > 0 && (
				<MetricSparkline data={trend} color={trendColor} />
			)}
			<div className="relative">
				<div className="flex items-center gap-2 mb-2">
					<Icon className="size-4 text-muted-foreground" />
					<p className="text-sm text-muted-foreground">{title}</p>
				</div>
				<p className="text-2xl font-semibold">{value}</p>
				<p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
			</div>
		</div>
	);
}

function MetricCardSkeleton() {
	return (
		<div className="rounded-lg border border-border bg-card p-4">
			<div className="flex items-center gap-2 mb-2">
				<Skeleton className="size-4" />
				<Skeleton className="h-4 w-24" />
			</div>
			<Skeleton className="h-8 w-16 mb-1" />
			<Skeleton className="h-3 w-32" />
		</div>
	);
}
