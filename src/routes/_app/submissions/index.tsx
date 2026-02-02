import { IconFileText, IconPlus } from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/page-header";
import { SubmissionsTable } from "@/components/submissions/submissions-table";
import { Button } from "@/components/ui/button";
import { getMySubmissionsFn } from "@/utils/submissions.functions";

export const Route = createFileRoute("/_app/submissions/")({
	loader: async () => {
		const submissions = await getMySubmissionsFn();
		return { submissions };
	},
	component: SubmissionsPage,
});

function SubmissionsPage() {
	const { submissions } = Route.useLoaderData();

	// Sort submissions by newest first (updatedAt DESC)
	const sortedSubmissions = [...submissions].sort(
		(a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
	);

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconFileText} title="Submissions">
				<Link to="/submissions/new">
					<Button className="gap-2">
						<IconPlus className="size-4" />
						New Submission
					</Button>
				</Link>
			</PageHeader>
			<div className="flex-1 p-6 overflow-auto">
				<SubmissionsTable submissions={sortedSubmissions} />
			</div>
		</div>
	);
}
