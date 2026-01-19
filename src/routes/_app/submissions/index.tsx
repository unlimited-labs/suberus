import { createFileRoute, Link } from "@tanstack/react-router";
import { IconFileText, IconPlus } from "@tabler/icons-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { SubmissionsTable } from "@/components/submissions/submissions-table";
import { mockSubmissions } from "@/lib/mock-data/submissions";

export const Route = createFileRoute("/_app/submissions/")({
	component: SubmissionsPage,
});

function SubmissionsPage() {
	// Sort submissions by newest first (updatedAt DESC)
	const sortedSubmissions = [...mockSubmissions].sort(
		(a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
	);

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconFileText} title="Zgłoszenia">
				<Link to="/submissions/new">
					<Button className="gap-2">
						<IconPlus className="size-4" />
						Nowe zgłoszenie
					</Button>
				</Link>
			</PageHeader>
			<div className="flex-1 p-6 overflow-auto">
				<SubmissionsTable submissions={sortedSubmissions} />
			</div>
		</div>
	);
}
