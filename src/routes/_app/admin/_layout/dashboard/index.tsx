import { IconDashboard } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { HealthAlerts } from "@/components/admin/dashboard/health-alerts";
import { MetricsGrid } from "@/components/admin/dashboard/metrics-grid";
import { QuickActions } from "@/components/admin/dashboard/quick-actions";
import { RecentActivity } from "@/components/admin/dashboard/recent-activity";
import { ReviewProgress } from "@/components/admin/dashboard/review-progress";
import { SubmissionChart } from "@/components/admin/dashboard/submission-chart";
import { UserCountryMap } from "@/components/admin/dashboard/user-country-map";
import { PageHeader } from "@/components/layout/page-header";
import { adminDashboardQueryOptions } from "@/utils/admin-dashboard.functions";

export const Route = createFileRoute("/_app/admin/_layout/dashboard/")({
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(adminDashboardQueryOptions());
	},
	component: AdminDashboard,
});

function AdminDashboard() {
	const { data } = useSuspenseQuery({
		...adminDashboardQueryOptions(),
		refetchInterval: 60000, // 60s refresh
	});

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconDashboard} title="Admin Dashboard" />
			<div className="flex-1 overflow-auto p-6 space-y-6">
				<HealthAlerts
					data={data?.health}
					s3={data?.s3}
					smtp={data?.smtp}
					llm={data?.llm}
				/>
				<MetricsGrid metrics={data} isLoading={false} />
				<div className="grid gap-6 lg:grid-cols-2">
					<SubmissionChart data={data?.submissions} />
					<ReviewProgress data={data?.reviews} />
				</div>
				<UserCountryMap data={data?.usersByCountry} />
				<div className="grid gap-6 lg:grid-cols-2">
					<RecentActivity events={data?.recentActivity} />
					<QuickActions />
				</div>
			</div>
		</div>
	);
}
