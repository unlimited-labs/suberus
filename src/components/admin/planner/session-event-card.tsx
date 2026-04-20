import { IconCircleCheckFilled, IconUsers } from "@tabler/icons-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface SessionEventData {
	kind: "session";
	sessionId: string;
	trackColor: string | null;
	trackName: string | null;
	sessionDurationMin: number;
	chairs: Array<{ firstName: string | null; lastName: string | null }>;
	presentations: Array<{
		id: string;
		submissionTitle: string;
		durationMin: number;
	}>;
}

function initials(
	first: string | null | undefined,
	last: string | null | undefined,
): string {
	const a = (first ?? "").trim()[0] ?? "";
	const b = (last ?? "").trim()[0] ?? "";
	return `${a}${b}`.toUpperCase() || "?";
}

export function SessionEventCard({
	title,
	data,
	onSubmissionDrop,
}: {
	title: string;
	data: SessionEventData;
	onSubmissionDrop?: (submissionId: string) => void;
}) {
	const band = data.trackColor ?? "var(--muted-foreground)";
	const hasChairs = data.chairs.length > 0;
	const slotCount = data.presentations.length;
	const usedMin = data.presentations.reduce((s, p) => s + p.durationMin, 0);
	const capacityPct =
		data.sessionDurationMin > 0
			? Math.min(100, Math.round((usedMin / data.sessionDurationMin) * 100))
			: 0;
	const capacityFull = usedMin >= data.sessionDurationMin;
	const [isDragOver, setIsDragOver] = useState(false);

	return (
		<section
			aria-label={title}
			className={cn(
				"relative flex h-full flex-col gap-1 overflow-hidden rounded-md border bg-background p-1.5 pl-2.5 text-[11px] shadow-sm transition-colors",
				!hasChairs && "border-dashed",
				isDragOver && "border-primary bg-accent ring-2 ring-primary",
			)}
			onDragOver={(e) => {
				if (!e.dataTransfer.types.includes("submissionid")) return;
				e.preventDefault();
				e.stopPropagation();
				setIsDragOver(true);
			}}
			onDragEnter={(e) => {
				if (!e.dataTransfer.types.includes("submissionid")) return;
				e.preventDefault();
				setIsDragOver(true);
			}}
			onDragLeave={() => setIsDragOver(false)}
			onDrop={(e) => {
				e.preventDefault();
				e.stopPropagation();
				setIsDragOver(false);
				const submissionId = e.dataTransfer.getData("submissionid");
				if (submissionId && onSubmissionDrop) {
					onSubmissionDrop(submissionId);
				}
			}}
		>
			{/* Track color band */}
			<span
				className="absolute left-0 top-0 h-full w-[3px]"
				style={{ backgroundColor: band }}
			/>

			{/* Header: title + chairs */}
			<div className="flex items-start justify-between gap-1">
				<div className="min-w-0 flex-1">
					<p className="truncate font-semibold leading-tight text-foreground">
						{title}
					</p>
					{data.trackName && (
						<p className="truncate text-[10px] text-muted-foreground">
							{data.trackName}
						</p>
					)}
				</div>

				{hasChairs ? (
					<div className="flex shrink-0 -space-x-1">
						{data.chairs.slice(0, 3).map((c, i) => (
							<span
								key={`${c.firstName}-${c.lastName}-${i}`}
								className="inline-flex size-5 items-center justify-center rounded-full border border-background bg-muted text-[9px] font-semibold text-muted-foreground"
								title={`${c.firstName ?? ""} ${c.lastName ?? ""}`.trim()}
							>
								{initials(c.firstName, c.lastName)}
							</span>
						))}
					</div>
				) : (
					<span
						className="inline-flex shrink-0 items-center gap-0.5 text-[9px] text-amber-600 dark:text-amber-400"
						title="No chair assigned"
					>
						<IconUsers className="size-3" />!
					</span>
				)}
			</div>

			{/* Capacity bar */}
			<div className="mt-auto pt-1">
				<div className="flex items-center justify-between text-[9px] text-muted-foreground/70">
					<span>
						{slotCount} {slotCount === 1 ? "talk" : "talks"} ·{" "}
						<span className="tabular-nums">
							{usedMin}/{data.sessionDurationMin} min
						</span>
					</span>
					{capacityFull && (
						<IconCircleCheckFilled
							className="size-3.5 text-emerald-600 dark:text-emerald-400"
							aria-label="Full"
						/>
					)}
				</div>
				<div className="mt-0.5 h-[3px] w-full overflow-hidden rounded-full bg-muted">
					<div
						className={cn(
							"h-full rounded-full transition-all",
							capacityFull ? "bg-emerald-500" : "bg-primary/60",
						)}
						style={{ width: `${capacityPct}%` }}
					/>
				</div>
			</div>
		</section>
	);
}
