import { IconArrowLeft, IconGitCompare } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { editorSubmissionQueryOptions } from "@/features/submissions/api/admin-submissions";
import {
	type CompareLayout,
	defaultComparePair,
	VersionCompare,
} from "@/features/submissions/components/diff/version-compare";
import { typeLabels } from "@/features/submissions/labels";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

const searchSchema = z.object({
	base: z.coerce.number().int().positive().optional(),
	compare: z.coerce.number().int().positive().optional(),
	view: z.enum(["split", "inline"]).optional(),
});

export const Route = createFileRoute(
	"/_app/admin/_layout/submissions/$id_/compare",
)({
	validateSearch: searchSchema,
	loader: async ({ params, context }) => {
		await context.queryClient.ensureQueryData(
			editorSubmissionQueryOptions(params.id),
		);
	},
	component: CompareVersionsPage,
});

/** Resolve the active pair + layout from search params, defaulting sensibly. */
function resolveCompare(
	search: { base?: number; compare?: number; view?: CompareLayout },
	versions: Array<{ version: number }>,
	current: number,
): { base: number; compare: number; layout: CompareLayout } {
	const fallback = defaultComparePair(versions, current);
	return {
		base: search.base ?? fallback.base,
		compare: search.compare ?? fallback.compare,
		layout: search.view ?? "split",
	};
}

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
				<Link to="/admin/submissions/$id" params={{ id }}>
					<Button variant="outline" className="gap-2">
						<IconArrowLeft className="size-4" />
						Back to submission
					</Button>
				</Link>
			</PageHeader>

			<div className="flex-1 overflow-auto p-6">
				<div className="mx-auto max-w-6xl space-y-6">
					<div className="space-y-2">
						<Badge variant="outline">{typeLabels[submission.type]}</Badge>
						<h1 className="text-xl font-semibold leading-snug text-foreground">
							{submission.title}
						</h1>
					</div>

					<VersionCompare
						versions={versions}
						currentVersionNumber={submission.currentVersionNumber}
						base={base}
						compare={compare}
						layout={layout}
						showMetadata
						onBaseChange={(n) => setParam({ base: n })}
						onCompareChange={(n) => setParam({ compare: n })}
						onLayoutChange={(l) => setParam({ view: l })}
					/>
				</div>
			</div>
		</div>
	);
}
