import { IconDashboard } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	useNavigate,
	useSearch,
} from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { redirectExhibitorRouteMiddleware } from "@/features/auth/server/middleware";
import { userDashboardQueryOptions } from "@/features/dashboard/api/user-dashboard";
import { PageHeader } from "@/shared/components/layout/page-header";
import { useSession } from "@/shared/hooks/use-session";

const searchSchema = z.object({
	verified: z.literal(true).optional(),
	error: z.string().optional(),
});

export const Route = createFileRoute("/_app/")({
	validateSearch: searchSchema,
	server: {
		middleware: [redirectExhibitorRouteMiddleware],
	},
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(userDashboardQueryOptions());
	},
	component: DashboardPage,
});

function DashboardPage() {
	const navigate = useNavigate();
	const { user, isPending } = useSession();
	const { verified, error } = useSearch({ from: "/_app/" });
	const toastShown = useRef(false);

	const { data } = useSuspenseQuery(userDashboardQueryOptions());

	// Client-side guard for SPA navigations (server middleware covers full loads)
	useEffect(() => {
		if (!isPending && user?.role === "EXHIBITOR") {
			navigate({ to: "/exhibitor" });
		}
	}, [isPending, user, navigate]);

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

	if (user?.role === "EXHIBITOR") return null;

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
		<div className="border-border bg-card rounded-lg border p-4">
			<p className="text-muted-foreground text-sm">{title}</p>
			<p className="text-2xl font-semibold">{value ?? 0}</p>
		</div>
	);
}
