import { IconArrowLeft, IconGitCompare } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { assignmentForReviewQueryOptions } from "@/features/reviews/api";
import {
	compareSearchSchema,
	resolveCompare,
} from "@/features/submissions/components/diff/compare-route";
import { VersionCompare } from "@/features/submissions/components/diff/version-compare";
import { PageHeader } from "@/shared/components/layout/page-header";
import { typeLabels } from "@/shared/lib/labels/submission";
import { lookup } from "@/shared/lib/lookup";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

export const Route = createFileRoute("/_app/reviews/$assignmentId_/compare")({
	validateSearch: compareSearchSchema,
	loader: async ({ params, context }) => {
		await context.queryClient.ensureQueryData(
			assignmentForReviewQueryOptions(params.assignmentId),
		);
	},
	component: ReviewerComparePage,
});

function ReviewerComparePage() {
	const { assignmentId } = Route.useParams();
	const search = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const { data } = useSuspenseQuery(
		assignmentForReviewQueryOptions(assignmentId),
	);

	const backLink = (
		<Link params={{ assignmentId }} to="/reviews/$assignmentId">
			<Button className="gap-2" variant="outline">
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
				<div className="flex flex-1 items-center justify-center p-6">
					<p className="text-muted-foreground text-sm">
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

			<div className="fade flex-1 overflow-auto p-6">
				<div className="space-y-6">
					<div className="space-y-2">
						<Badge variant="outline">
							{lookup(typeLabels, submission.type) ?? submission.type}
						</Badge>
						<h1 className="text-foreground text-xl leading-snug font-semibold">
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
						versions={submission.versions}
					/>
				</div>
			</div>
		</div>
	);
}
