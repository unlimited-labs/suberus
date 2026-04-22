import { IconDashboard } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/layout/page-header";
import { userDashboardQueryOptions } from "@/server-fns/user-dashboard";

const searchSchema = z.object({
	verified: z.literal(true).optional(),
	error: z.string().optional(),
});

export const Route = createFileRoute("/_app/")({
	validateSearch: searchSchema,
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(userDashboardQueryOptions());
	},
	component: DashboardPage,
});

function DashboardPage() {
	const { verified, error } = useSearch({ from: "/_app/" });
	const toastShown = useRef(false);

	const { data } = useSuspenseQuery(userDashboardQueryOptions());

	useEffect(() => {
		if (verified && !toastShown.current) {
			toastShown.current = true;
			if (error) {
				toast.info("Email is already verified.");
			} else {
				toast.success("Email verified successfully!");
			}
		}
	}, [verified, error]);

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconDashboard} title="Dashboard" />
			<div className="flex-1 space-y-6 p-6">
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
					<StatCard title="Total Submissions" value={data.mySubmissions} />
					<StatCard title="Under Review" value={data.underReview} />
					<StatCard title="Pending Reviews" value={data.pendingReviews} />
					<StatCard title="Accepted" value={data.accepted} />
				</div>
			</div>
		</div>
	);
}

function StatCard({ title, value }: { title: string; value: number }) {
	return (
		<div className="rounded-lg border border-border bg-card p-4">
			<p className="text-sm text-muted-foreground">{title}</p>
			<p className="text-2xl font-semibold">{value ?? 0}</p>
		</div>
	);
}
