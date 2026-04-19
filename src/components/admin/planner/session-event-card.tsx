import { IconUsers } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export interface SessionEventData {
	kind: "session";
	sessionId: string;
	trackColor: string | null;
	trackName: string | null;
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
}: {
	title: string;
	data: SessionEventData;
}) {
	const band = data.trackColor ?? "var(--muted-foreground)";
	const hasChairs = data.chairs.length > 0;
	const slotCount = data.presentations.length;

	return (
		<div
			className={cn(
				"relative flex h-full flex-col gap-1 overflow-hidden rounded-md border bg-background p-1.5 pl-2.5 text-[11px] shadow-sm",
				!hasChairs && "border-dashed",
			)}
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

			{/* Slot list */}
			{slotCount > 0 ? (
				<ul className="min-h-0 flex-1 space-y-0.5 overflow-hidden text-[10px] text-muted-foreground">
					{data.presentations.slice(0, 4).map((p, idx) => (
						<li key={p.id} className="flex items-center gap-1 truncate">
							<span className="shrink-0 tabular-nums text-[9px] opacity-60">
								{idx + 1}.
							</span>
							<span className="truncate">{p.submissionTitle}</span>
							<span className="ml-auto shrink-0 text-[9px] opacity-60">
								{p.durationMin}′
							</span>
						</li>
					))}
					{slotCount > 4 && (
						<li className="text-[9px] italic opacity-60">
							+{slotCount - 4} more
						</li>
					)}
				</ul>
			) : (
				<p className="text-[10px] italic opacity-60">No talks assigned</p>
			)}
		</div>
	);
}
