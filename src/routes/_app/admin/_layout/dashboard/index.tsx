import { IconDashboard } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { adminDashboardQueryOptions } from "@/features/dashboard/api/admin-dashboard";
import { HealthAlerts } from "@/features/dashboard/components/admin/health-alerts";
import { MetricsGrid } from "@/features/dashboard/components/admin/metrics-grid";
import { QuickActions } from "@/features/dashboard/components/admin/quick-actions";
import { RecentActivity } from "@/features/dashboard/components/admin/recent-activity";
import { ReviewProgress } from "@/features/dashboard/components/admin/review-progress";
import { SubmissionChart } from "@/features/dashboard/components/admin/submission-chart";
import { SystemHealthCard } from "@/features/dashboard/components/admin/system-health-card";
import { UsersByCountryCard } from "@/features/dashboard/components/admin/users-by-country-card";
import { PageHeader } from "@/shared/components/layout/page-header";

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
				<HealthAlerts data={data.health} s3={data.s3} smtp={data.smtp} />
				<MetricsGrid metrics={data} isLoading={false} />
				<div className="grid gap-6 lg:grid-cols-2">
					<SubmissionChart data={data.submissions} />
					<ReviewProgress data={data.reviews} />
				</div>
				<UsersByCountryCard data={data.usersByCountry} />
				<div className="grid gap-6 lg:grid-cols-2">
					<RecentActivity events={data.recentActivity} />
					<QuickActions />
				</div>
				<SystemHealthCard
					s3={data.s3}
					smtp={data.smtp}
					llm={data.llm}
					docling={data.docling}
				/>
			</div>
		</div>
	);
}
