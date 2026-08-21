import { IconFileText } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { compareDesc } from "date-fns";
import { useEffect } from "react";
import { redirectExhibitorRouteMiddleware } from "@/features/auth/server/middleware";
import {
	activeSubmissionTypesQueryOptions,
	submissionDeadlineQueryOptions,
} from "@/features/settings/api/settings";
import { mySubmissionsQueryOptions } from "@/features/submissions/api/submissions";
import { NewSubmissionButton } from "@/features/submissions/components/list/new-submission-button";
import { SubmissionsDeadlineBanner } from "@/features/submissions/components/list/submissions-deadline-banner";
import { SubmissionsEmptyState } from "@/features/submissions/components/list/submissions-empty-state";
import { useSubmissionAccess } from "@/features/submissions/components/list/use-submission-access";
import { SubmissionsTable } from "@/features/submissions/components/submissions-table";
import { PageHeader } from "@/shared/components/layout/page-header";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { useSession } from "@/shared/hooks/use-session";

export const Route = createFileRoute("/_app/submissions/")({
	server: {
		middleware: [redirectExhibitorRouteMiddleware],
	},
	loader: async ({ context }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(mySubmissionsQueryOptions()),
			context.queryClient.ensureQueryData(submissionDeadlineQueryOptions()),
			context.queryClient.ensureQueryData(activeSubmissionTypesQueryOptions()),
		]);
	},
	component: SubmissionsPage,
});

function SubmissionsPage() {
	const navigate = useNavigate();
	const { user, isPending } = useSession();

	// Client-side guard for SPA navigations (server middleware covers full loads)
	useEffect(() => {
		if (!isPending && user?.role === "EXHIBITOR") {
			navigate({ to: "/exhibitor" });
		}
	}, [isPending, user, navigate]);

	const { data: submissions } = useSuspenseQuery(mySubmissionsQueryOptions());
	const {
		deadline,
		deadlineUrgent,
		deadlineCritical,
		canSubmit,
		disabledReason,
	} = useSubmissionAccess();
	const { formatDate } = useDateFormat();

	const sortedSubmissions = submissions.toSorted((a, b) =>
		compareDesc(new Date(a.updatedAt), new Date(b.updatedAt)),
	);

	if (user?.role === "EXHIBITOR") return null;

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconFileText} title="Submissions">
				<NewSubmissionButton
					canSubmit={canSubmit}
					disabledReason={disabledReason}
				/>
			</PageHeader>
			{deadline && (
				<SubmissionsDeadlineBanner
					critical={deadlineCritical}
					formattedDeadline={formatDate(deadline)}
					urgent={deadlineUrgent}
				/>
			)}
			<div className="flex-1 p-6 overflow-auto">
				{sortedSubmissions.length === 0 ? (
					<SubmissionsEmptyState canSubmit={canSubmit} />
				) : (
					<SubmissionsTable submissions={sortedSubmissions} />
				)}
			</div>
		</div>
	);
}
