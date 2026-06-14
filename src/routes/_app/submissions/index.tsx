import {
	IconCalendar,
	IconFileText,
	IconLock,
	IconPlus,
} from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { compareDesc, differenceInCalendarDays, isAfter } from "date-fns";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { mySubmissionsQueryOptions } from "@/features/submissions/api/submissions";
import { SubmissionsTable } from "@/features/submissions/components/submissions-table";
import { redirectExhibitorRouteMiddleware } from "@/lib/server/middleware/auth";
import {
	activeSubmissionTypesQueryOptions,
	submissionDeadlineQueryOptions,
} from "@/server-fns/settings";
import { PageHeader } from "@/shared/components/layout/page-header";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { useSession } from "@/shared/hooks/use-session";
import { cn } from "@/shared/lib/utils";

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
		data: { deadline, locked, canBypass },
	} = useSuspenseQuery(submissionDeadlineQueryOptions());
	const { data: activeTypes } = useSuspenseQuery(
		activeSubmissionTypesQueryOptions(),
	);
	const { formatDate } = useDateFormat();
	const daysLeft = deadline
		? differenceInCalendarDays(new Date(deadline), new Date())
		: null;
	const deadlineUrgent = daysLeft !== null && daysLeft <= 7;
	const deadlineCritical = daysLeft !== null && daysLeft <= 3;
	const deadlineOpen =
		canBypass || (deadline ? isAfter(new Date(deadline), new Date()) : true);
	const hasActiveTypes = activeTypes.length > 0;
	const canSubmit = (canBypass || !locked) && deadlineOpen && hasActiveTypes;

	const disabledReason =
		!canBypass && locked
			? "Submissions have been closed by the administrator"
			: !deadlineOpen
				? "The submission deadline has passed"
				: !hasActiveTypes
					? "No submission types are currently active"
					: "";

	// Sort submissions by newest first (updatedAt DESC)
	const sortedSubmissions = [...submissions].sort((a, b) =>
		compareDesc(new Date(a.updatedAt), new Date(b.updatedAt)),
	);

	if (user?.role === "EXHIBITOR") return null;

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconFileText} title="Submissions">
				{canSubmit ? (
					<Link to="/submissions/new">
						<Button className="gap-2">
							<IconPlus className="size-4" />
							New Submission
						</Button>
					</Link>
				) : (
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<span
									data-testid="new-submission-disabled"
									className="inline-block cursor-not-allowed"
								>
									<Button className="gap-2 pointer-events-none" disabled>
										<IconPlus className="size-4" />
										New Submission
									</Button>
								</span>
							</TooltipTrigger>
							<TooltipContent>{disabledReason}</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				)}
			</PageHeader>
			{deadline && (
				<div
					data-testid="submission-deadline"
					className="flex items-center gap-2 border-b border-border px-6 py-2 text-sm"
				>
					<IconCalendar className="size-4 text-muted-foreground" />
					<span className="text-muted-foreground">Submission deadline:</span>
					<span
						data-testid="submission-deadline-date"
						className={cn(
							"font-medium",
							deadlineUrgent && "text-red-700 dark:text-red-400",
							deadlineCritical && "font-bold",
						)}
					>
						{formatDate(deadline)}
					</span>
				</div>
			)}
			<div className="flex-1 p-6 overflow-auto">
				{sortedSubmissions.length === 0 ? (
					<div className="rounded-lg border border-border/50 p-8 text-center">
						{canSubmit ? (
							<>
								<IconFileText className="mx-auto size-12 text-muted-foreground/50" />
								<p className="mt-4 text-muted-foreground">
									You don't have any submissions yet
								</p>
								<Link to="/submissions/new">
									<Button className="mt-4 gap-2">
										<IconPlus className="size-4" />
										Create your first submission
									</Button>
								</Link>
							</>
						) : (
							<>
								<IconLock className="mx-auto size-12 text-muted-foreground/50" />
								<p className="mt-4 text-muted-foreground">
									Submissions are closed
								</p>
							</>
						)}
					</div>
				) : (
					<SubmissionsTable submissions={sortedSubmissions} />
				)}
			</div>
		</div>
	);
}
