import {
	IconAlertTriangle,
	IconArrowLeft,
	IconCheck,
	IconClock,
	IconDoorEnter,
	IconFileText,
	IconLayoutGrid,
	IconLoader2,
	IconRobot,
	IconSparkles,
	IconWand,
} from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import type { ComponentType } from "react";
import type { getAutoPlanJobFn } from "@/features/planner/api/autoplan";
import { useAutoPlanState } from "@/features/planner/components/hooks/use-auto-plan-state";
import type { AutoplanStage } from "@/features/planner/server/autoplan-types";
import { PageHeader } from "@/shared/components/layout/page-header";
import { cn } from "@/shared/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Progress } from "@/shared/ui/progress";
import { Separator } from "@/shared/ui/separator";

export const Route = createFileRoute(
	"/_app/admin/_layout/program-planner/auto-plan",
)({
	component: AutoPlanPage,
});

type Stage = AutoplanStage | "done";

interface StageSpec {
	key: Stage;
	label: string;
	description: string;
	icon: ComponentType<{ className?: string }>;
}

const STAGES: StageSpec[] = [
	{
		key: "loading",
		label: "Loading data",
		description: "Fetching accepted abstracts and sessions",
		icon: IconFileText,
	},
	{
		key: "embedding",
		label: "Analyzing abstracts",
		description: "Generating semantic embeddings",
		icon: IconRobot,
	},
	{
		key: "clustering",
		label: "Grouping",
		description: "Balanced constrained clustering",
		icon: IconLayoutGrid,
	},
	{
		key: "labeling",
		label: "Writing titles",
		description: "AI-generated session names",
		icon: IconSparkles,
	},
];

function formatDateRange(startAt: string, endAt: string): string {
	const s = new Date(startAt);
	const e = new Date(endAt);
	const date = format(s, "EEE, MMM d");
	const hm = (d: Date) => format(d, "HH:mm");
	return `${date} · ${hm(s)}–${hm(e)}`;
}

function AutoPlanPage() {
	const {
		jobId,
		sse,
		running,
		errorMsg,
		proposal,
		startPending,
		generate,
		applyPlan,
		applying,
		goBack,
	} = useAutoPlanState();

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconWand} title="Auto-plan sessions">
				<Button className="gap-1.5" onClick={goBack} size="sm" variant="ghost">
					<IconArrowLeft className="h-4 w-4" />
					Back to planner
				</Button>
			</PageHeader>

			<div className="flex-1 overflow-y-auto">
				<div className="mx-auto max-w-5xl px-8 py-10">
					{!jobId && !startPending && !errorMsg && (
						<IntroView
							onCancel={goBack}
							onGenerate={generate}
							pending={startPending}
						/>
					)}

					{running && (
						<ProgressView
							progress={{
								stage: sse.stage,
								current: sse.current,
								total: sse.total,
							}}
						/>
					)}

					{errorMsg && !running && (
						<ErrorView message={errorMsg} onBack={goBack} />
					)}

					{proposal && (
						<ResultsView
							applying={applying}
							onApply={applyPlan}
							onDiscard={goBack}
							proposal={proposal}
						/>
					)}
				</div>
			</div>
		</div>
	);
}

function IntroView({
	onGenerate,
	onCancel,
	pending,
}: {
	onGenerate: () => void;
	onCancel: () => void;
	pending: boolean;
}) {
	return (
		<div className="flex flex-col items-center gap-8 pt-8 text-center">
			<div className="relative">
				<div className="bg-primary/20 absolute inset-0 animate-pulse rounded-full blur-2xl" />
				<div className="from-primary to-primary/70 text-primary-foreground shadow-primary/25 relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br shadow-lg">
					<IconWand className="h-12 w-12" />
					<IconSparkles className="absolute top-3 right-3 h-5 w-5 text-white/90" />
				</div>
			</div>
			<div className="max-w-lg space-y-3">
				<h2 className="text-foreground text-xl font-semibold">
					Generate a session preview from accepted abstracts
				</h2>
				<p className="text-muted-foreground text-sm">
					Each session will get a proposed title and a set of thematically
					related presentations. Nothing changes in the schedule until you
					apply.
				</p>
			</div>
			<div className="flex gap-3">
				<Button disabled={pending} onClick={onCancel} variant="ghost">
					Cancel
				</Button>
				<Button className="gap-1.5" disabled={pending} onClick={onGenerate}>
					<IconSparkles className="h-4 w-4" />
					Generate proposal
				</Button>
			</div>
		</div>
	);
}

function ProgressView({
	progress,
}: {
	progress: { stage: string; current: number; total: number };
}) {
	// SAFETY: the autoplan worker reports only these stage names.
	const currentStage = (progress.stage ?? "loading") as Stage;
	const activeIdx = STAGES.findIndex((s) => s.key === currentStage);
	const current = progress.current;
	const total = progress.total;

	// Global progress: each stage is 1/n of the whole; add sub-progress within current stage.
	const stageCount = STAGES.length;
	const baseProgress = Math.max(0, activeIdx) / stageCount;
	const subProgress = total > 0 ? current / total / stageCount : 0;
	const overallPct = Math.min(
		100,
		Math.round((baseProgress + subProgress) * 100),
	);

	return (
		<div className="space-y-8">
			<div className="space-y-3">
				<div className="flex items-center justify-between text-sm">
					<span className="font-medium">Generating proposal</span>
					<span className="text-muted-foreground font-mono tabular-nums">
						{overallPct}%
					</span>
				</div>
				<Progress className="h-2" value={overallPct} />
			</div>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{STAGES.map((spec, i) => {
					const status: "pending" | "running" | "done" =
						i < activeIdx ? "done" : i === activeIdx ? "running" : "pending";
					return (
						<StageCard
							current={status === "running" ? current : 0}
							key={spec.key}
							spec={spec}
							status={status}
							total={status === "running" ? total : 0}
						/>
					);
				})}
			</div>
		</div>
	);
}

type StageStatus = "pending" | "running" | "done";

interface StageStyle {
	container: string;
	iconWrap: string;
	statusText: string;
	statusDot: string;
	label: string;
	strip: string;
}

const STAGE_STYLES = {
	pending: {
		container: "border-dashed opacity-60",
		iconWrap: "bg-muted text-muted-foreground/70",
		statusText: "text-muted-foreground/60",
		statusDot: "bg-muted-foreground/30",
		label: "text-muted-foreground",
		strip: "bg-muted/30",
	},
	running: {
		container:
			"border-primary/60 shadow-md shadow-primary/10 ring-2 ring-primary/20",
		iconWrap:
			"bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm shadow-primary/40",
		statusText: "text-primary",
		statusDot: "animate-pulse bg-primary",
		label: "",
		strip: "bg-primary/15",
	},
	done: {
		container: "border-primary/30 bg-primary/[0.03]",
		iconWrap: "bg-primary/15 text-primary ring-1 ring-primary/20",
		statusText: "text-primary/70",
		statusDot: "bg-primary",
		label: "",
		strip: "bg-primary/40",
	},
} satisfies Record<StageStatus, StageStyle>;

function StageIcon({
	status,
	icon: Icon,
}: {
	status: StageStatus;
	icon: ComponentType<{ className?: string }>;
}) {
	if (status === "running")
		return <IconLoader2 className="h-5 w-5 animate-spin" />;
	if (status === "done")
		return <IconCheck className="h-5 w-5" strokeWidth={3} />;
	return <Icon className="h-5 w-5" />;
}

function StageCard({
	spec,
	status,
	current,
	total,
}: {
	spec: StageSpec;
	status: StageStatus;
	current: number;
	total: number;
}) {
	const st = STAGE_STYLES[status];
	const pct = status === "running" && total > 0 ? (current / total) * 100 : 0;

	return (
		<div
			className={cn(
				"group relative flex h-44 flex-col overflow-hidden rounded-xl border bg-card p-5 transition-[color,background-color,border-color,box-shadow] duration-300",
				st.container,
			)}
		>
			{/* Top: icon + status dot */}
			<div className="flex items-start justify-between">
				<div className="relative">
					{status === "running" && (
						<span className="bg-primary/30 absolute -inset-1.5 animate-ping rounded-2xl" />
					)}
					<span
						className={cn(
							"relative flex h-12 w-12 items-center justify-center rounded-xl transition-colors",
							st.iconWrap,
						)}
					>
						<StageIcon icon={spec.icon} status={status} />
					</span>
				</div>

				<span
					className={cn(
						"flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider",
						st.statusText,
					)}
				>
					<span className={cn("h-1.5 w-1.5 rounded-full", st.statusDot)} />
					{status}
				</span>
			</div>

			{/* Middle: label + description */}
			<div className="mt-4 flex-1 space-y-1">
				<div className={cn("text-sm font-semibold leading-tight", st.label)}>
					{spec.label}
				</div>
				<div className="text-muted-foreground text-xs">
					{status === "running" && total > 0
						? `${current} of ${total}`
						: spec.description}
				</div>
			</div>

			{/* Bottom: progress strip */}
			<div className={cn("-mx-5 -mb-5 mt-3 h-1 overflow-hidden", st.strip)}>
				{status === "running" &&
					(total > 0 ? (
						<div
							className="from-primary/60 to-primary h-full bg-gradient-to-r transition-[width] duration-500"
							style={{ width: `${pct}%` }}
						/>
					) : (
						<div className="bg-primary h-full animate-pulse" />
					))}
			</div>
		</div>
	);
}

function ErrorView({
	message,
	onBack,
}: {
	message: string;
	onBack: () => void;
}) {
	return (
		<div className="space-y-6">
			<Alert variant="destructive">
				<IconAlertTriangle className="h-4 w-4" />
				<AlertTitle>Auto-plan failed</AlertTitle>
				<AlertDescription>{message}</AlertDescription>
			</Alert>
			<Button className="gap-1.5" onClick={onBack} variant="outline">
				<IconArrowLeft className="h-4 w-4" />
				Back to planner
			</Button>
		</div>
	);
}

function ResultsView({
	proposal,
	onDiscard,
	onApply,
	applying,
}: {
	proposal: NonNullable<
		Awaited<ReturnType<typeof getAutoPlanJobFn>>["proposal"]
	>;
	onDiscard: () => void;
	onApply: () => void;
	applying: boolean;
}) {
	const changedCount = proposal.sessions.filter(
		(s) => s.originalTitle !== s.proposedTitle,
	).length;

	return (
		<div className="space-y-6 pb-32">
			<div className="space-y-4">
				<div className="space-y-1">
					<h2 className="text-xl font-semibold">Proposal ready</h2>
					<p className="text-muted-foreground text-sm">
						Review below. Applying will overwrite current session titles and
						slot assignments — other planner data stays untouched.
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Badge className="h-6" variant="secondary">
						{proposal.stats.submissionCount} presentations
					</Badge>
					<Badge className="h-6" variant="secondary">
						{proposal.stats.sessionCount} sessions
					</Badge>
					<Badge className="h-6" variant="outline">
						target: {proposal.stats.targetPerSession} ({proposal.stats.sizeMin}–
						{proposal.stats.sizeMax})
					</Badge>
					{changedCount > 0 && (
						<Badge className="bg-primary/15 text-primary hover:bg-primary/15 h-6 gap-1">
							<IconSparkles className="h-3 w-3" />
							{changedCount} renamed
						</Badge>
					)}
				</div>
			</div>

			<Separator />

			<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
				{proposal.sessions.map((s, idx) => (
					<SessionCard index={idx + 1} key={s.sessionId} session={s} />
				))}
			</div>

			<div className="bg-background/80 fixed inset-x-0 bottom-0 border-t px-8 py-4 backdrop-blur">
				<div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
					<span className="text-muted-foreground text-xs">
						Nothing is saved yet.
					</span>
					<div className="flex gap-2">
						<Button disabled={applying} onClick={onDiscard} variant="ghost">
							Discard
						</Button>
						<Button className="gap-1.5" disabled={applying} onClick={onApply}>
							{applying ? (
								<>
									<IconLoader2 className="h-4 w-4 animate-spin" />
									Applying…
								</>
							) : (
								<>
									<IconCheck className="h-4 w-4" />
									Apply to schedule
								</>
							)}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}

function SessionCard({
	session: s,
	index,
}: {
	session: NonNullable<
		Awaited<ReturnType<typeof getAutoPlanJobFn>>["proposal"]
	>["sessions"][number];
	index: number;
}) {
	const titleChanged = s.originalTitle !== s.proposedTitle;
	return (
		<div className="bg-card hover:border-primary/40 flex flex-col gap-3 rounded-lg border p-5 transition-colors">
			<div className="flex items-start gap-3">
				<div className="bg-muted text-muted-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-semibold tabular-nums">
					{index}
				</div>
				<div className="min-w-0 flex-1 space-y-1">
					<div className="flex items-center gap-1.5 text-sm font-semibold">
						{titleChanged && (
							<IconSparkles className="text-primary h-3.5 w-3.5 shrink-0" />
						)}
						<span className="truncate">
							{s.proposedTitle || (
								<span className="text-muted-foreground italic">(no title)</span>
							)}
						</span>
					</div>
					{titleChanged && (
						<div className="text-muted-foreground truncate text-xs line-through">
							{s.originalTitle}
						</div>
					)}
					<div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 pt-1 text-xs">
						<span className="flex items-center gap-1.5">
							<IconClock className="h-3 w-3" />
							{formatDateRange(s.startAt, s.endAt)}
						</span>
						<span className="flex items-center gap-1.5">
							<IconDoorEnter className="h-3 w-3" />
							{s.roomName ?? (
								<span className="text-muted-foreground/70 italic">no room</span>
							)}
						</span>
					</div>
				</div>
			</div>
			<ul className="text-muted-foreground space-y-1 border-t pt-3 text-xs">
				{s.presentations.map((p, i) => (
					<li className="flex gap-2.5" key={p.submissionId}>
						<span className="w-5 shrink-0 text-right tabular-nums opacity-50">
							{i + 1}.
						</span>
						<span className="min-w-0 flex-1 truncate">{p.title}</span>
					</li>
				))}
			</ul>
		</div>
	);
}
