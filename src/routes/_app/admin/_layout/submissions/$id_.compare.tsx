import { IconArrowLeft, IconGitCompare } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { editorSubmissionQueryOptions } from "@/features/submissions/api/admin-submissions";
import {
	compareSearchSchema,
	resolveCompare,
} from "@/features/submissions/components/diff/compare-route";
import { VersionCompare } from "@/features/submissions/components/diff/version-compare";
import { typeLabels } from "@/features/submissions/labels";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

export const Route = createFileRoute(
	"/_app/admin/_layout/submissions/$id_/compare",
)({
	validateSearch: compareSearchSchema,
	loader: async ({ params, context }) => {
		await context.queryClient.ensureQueryData(
			editorSubmissionQueryOptions(params.id),
		);
	},
	component: CompareVersionsPage,
});

function CompareVersionsPage() {
	const { id } = Route.useParams();
	const search = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const { data } = useQuery(editorSubmissionQueryOptions(id));

	if (!data) return null;

	const { submission, versions } = data;
	const { base, compare, layout } = resolveCompare(
		search,
		versions,
		submission.currentVersionNumber,
	);
	const setParam = (patch: Partial<typeof search>) =>
		navigate({ search: (prev) => ({ ...prev, ...patch }) });

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconGitCompare} title="Compare versions">
				<Link params={{ id }} to="/admin/submissions/$id">
					<Button className="gap-2" variant="outline">
						<IconArrowLeft className="size-4" />
						Back to submission
					</Button>
				</Link>
			</PageHeader>

			<div className="flex-1 overflow-auto p-6">
				<div className="space-y-6">
					<div className="space-y-2">
						<Badge variant="outline">{typeLabels[submission.type]}</Badge>
						<h1 className="text-xl font-semibold leading-snug text-foreground">
							{submission.title}
						</h1>
					</div>

					<VersionCompare
						base={base}
						compare={compare}
						currentVersionNumber={submission.currentVersionNumber}
						layout={layout}
						onBaseChange={(n) => setParam({ base: n })}
						onCompareChange={(n) => setParam({ compare: n })}
						onLayoutChange={(l) => setParam({ view: l })}
						showMetadata
						versions={versions}
					/>
				</div>
			</div>
		</div>
	);
}
