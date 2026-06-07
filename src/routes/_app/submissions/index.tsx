import {
	IconCalendar,
	IconFileText,
	IconLock,
	IconPlus,
} from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/page-header";
import { SubmissionsTable } from "@/components/submissions/submissions-table";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDateFormat } from "@/hooks/use-date-format";
import { cn } from "@/lib/utils";
import {
	activeSubmissionTypesQueryOptions,
	submissionDeadlineQueryOptions,
} from "@/server-fns/settings";
import { mySubmissionsQueryOptions } from "@/server-fns/submissions";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export const Route = createFileRoute("/_app/submissions/")({
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
	const { data: submissions } = useSuspenseQuery(mySubmissionsQueryOptions());
	const {
		data: { deadline, locked },
	} = useSuspenseQuery(submissionDeadlineQueryOptions());
	const { data: activeTypes } = useSuspenseQuery(
		activeSubmissionTypesQueryOptions(),
	);
	const { formatDate } = useDateFormat();
	const daysLeft = deadline
		? Math.ceil((new Date(deadline).getTime() - Date.now()) / MS_PER_DAY)
		: null;
	const deadlineUrgent = daysLeft !== null && daysLeft <= 7;
	const deadlineCritical = daysLeft !== null && daysLeft <= 3;
	const deadlineOpen = deadline ? new Date(deadline) > new Date() : true;
	const hasActiveTypes = activeTypes.length > 0;
	const canSubmit = !locked && deadlineOpen && hasActiveTypes;

	const disabledReason = locked
		? "Submissions have been closed by the administrator"
		: !deadlineOpen
			? "The submission deadline has passed"
			: !hasActiveTypes
				? "No submission types are currently active"
				: "";

	// Sort submissions by newest first (updatedAt DESC)
	const sortedSubmissions = [...submissions].sort(
		(a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
	);

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
