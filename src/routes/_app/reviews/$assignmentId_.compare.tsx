import { IconArrowLeft, IconGitCompare } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { assignmentForReviewQueryOptions } from "@/features/reviews/api";
import {
	type CompareLayout,
	defaultComparePair,
	VersionCompare,
} from "@/features/submissions/components/diff/version-compare";
import type { SubmissionType } from "@/generated/prisma/enums";
import { PageHeader } from "@/shared/components/layout/page-header";
import { typeLabels } from "@/shared/lib/labels/submission";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

const searchSchema = z.object({
	base: z.coerce.number().int().positive().optional(),
	compare: z.coerce.number().int().positive().optional(),
	view: z.enum(["split", "inline"]).optional(),
});

export const Route = createFileRoute("/_app/reviews/$assignmentId_/compare")({
	validateSearch: searchSchema,
	loader: async ({ params, context }) => {
		await context.queryClient.ensureQueryData(
			assignmentForReviewQueryOptions(params.assignmentId),
		);
	},
	component: ReviewerComparePage,
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

function ReviewerComparePage() {
	const { assignmentId } = Route.useParams();
	const search = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const { data } = useSuspenseQuery(
		assignmentForReviewQueryOptions(assignmentId),
	);

	const backLink = (
		<Link to="/reviews/$assignmentId" params={{ assignmentId }}>
			<Button variant="outline" className="gap-2">
				<IconArrowLeft className="size-4" />
				Back to review
			</Button>
		</Link>
	);

	if (!data || data.submission.versions.length < 2) {
		return (
			<div className="flex h-full flex-col">
				<PageHeader icon={IconGitCompare} title="Compare versions">
					{backLink}
				</PageHeader>
				<div className="flex-1 p-6 flex items-center justify-center">
					<p className="text-sm text-muted-foreground">
						This submission has only one version — nothing to compare yet.
					</p>
				</div>
			</div>
		);
	}

	const { submission } = data;
	const { base, compare, layout } = resolveCompare(
		search,
		submission.versions,
		submission.currentVersionNumber,
	);
	const setParam = (patch: Partial<typeof search>) =>
		navigate({ search: (prev) => ({ ...prev, ...patch }) });

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconGitCompare} title="Compare versions">
				{backLink}
			</PageHeader>

			<div className="flex-1 overflow-auto p-6">
				<div className="mx-auto max-w-6xl space-y-6">
					<div className="space-y-2">
						<Badge variant="outline">
							{typeLabels[submission.type as SubmissionType] ?? submission.type}
						</Badge>
						<h1 className="text-xl font-semibold leading-snug text-foreground">
							{submission.title}
						</h1>
					</div>

					<VersionCompare
						versions={submission.versions}
						currentVersionNumber={submission.currentVersionNumber}
						base={base}
						compare={compare}
						layout={layout}
						onBaseChange={(n) => setParam({ base: n })}
						onCompareChange={(n) => setParam({ compare: n })}
						onLayoutChange={(l) => setParam({ view: l })}
					/>
				</div>
			</div>
		</div>
	);
}
