import { IconCash } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { adminOnlyRouteMiddleware } from "@/features/auth/server/middleware";
import { financesQueryOptions } from "@/features/finances/api/finances";
import { FinancesBoard } from "@/features/finances/components/admin/finances-board";
import { PageHeader } from "@/shared/components/layout/page-header";

export const Route = createFileRoute("/_app/admin/_layout/finances/")({
	server: {
		middleware: [adminOnlyRouteMiddleware],
	},
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(financesQueryOptions());
	},
	component: AdminFinancesPage,
});

function AdminFinancesPage() {
	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconCash} title="Finances" />
			<div className="flex-1 overflow-auto p-6">
				<FinancesBoard />
			</div>
		</div>
	);
}
