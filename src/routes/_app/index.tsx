import { IconDashboard } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getUserDashboard } from "@/utils/user-dashboard.functions";

const searchSchema = z.object({
	verified: z.enum(["true"]).optional(),
});

export const Route = createFileRoute("/_app/")({
	validateSearch: searchSchema,
	component: DashboardPage,
});

function DashboardPage() {
	const { verified } = useSearch({ from: "/_app/" });
	const toastShown = useRef(false);

	const { data, isLoading } = useQuery({
		queryKey: ["user-dashboard"],
		queryFn: async () => getUserDashboard(),
	});

	useEffect(() => {
		if (verified === "true" && !toastShown.current) {
			toastShown.current = true;
			toast.success("Email verified successfully!");
		}
	}, [verified]);

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconDashboard} title="Dashboard" />
			<div className="flex-1 space-y-6 p-6">
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
					<StatCard
						title="Total Submissions"
						value={data?.mySubmissions}
						isLoading={isLoading}
					/>
					<StatCard
						title="Under Review"
						value={data?.underReview}
						isLoading={isLoading}
					/>
					<StatCard
						title="Pending Reviews"
						value={data?.pendingReviews}
						isLoading={isLoading}
					/>
					<StatCard
						title="Accepted"
						value={data?.accepted}
						isLoading={isLoading}
					/>
				</div>
			</div>
		</div>
	);
}

function StatCard({
	title,
	value,
	isLoading,
}: {
	title: string;
	value: number | undefined;
	isLoading: boolean;
}) {
	return (
		<div className="rounded-lg border border-border bg-card p-4">
			<p className="text-sm text-muted-foreground">{title}</p>
			{isLoading ? (
				<Skeleton className="h-8 w-16 mt-1" />
			) : (
				<p className="text-2xl font-semibold">{value ?? 0}</p>
			)}
		</div>
	);
}
