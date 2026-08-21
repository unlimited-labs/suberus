import { useIlamyCalendarContext } from "@ilamy/calendar";
import { useState } from "react";
import { cn } from "@/shared/lib/utils";
import { CapacityBar } from "./session-card/capacity-bar";
import { ChairStack } from "./session-card/chair-stack";

export interface SessionEventData {
	kind: "session";
	sessionId: string;
	trackColor: string | null;
	trackName: string | null;
	sessionDurationMin: number;
	untimedSlots: boolean;
	chairs: Array<{ firstName: string | null; lastName: string | null }>;
	presentations: Array<{
		id: string;
		submissionTitle: string;
		durationMin: number;
	}>;
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
	const { view } = useIlamyCalendarContext();
	const compact = view === "week";
	const band = data.trackColor ?? "var(--muted-foreground)";
	const hasChairs = data.chairs.length > 0;
	const usedMin = data.presentations.reduce((s, p) => s + p.durationMin, 0);
	const [isDragOver, setIsDragOver] = useState(false);

	return (
		<section
			aria-label={title}
			className={cn(
				"relative flex h-full flex-col gap-1 overflow-hidden rounded-md border bg-background p-1.5 pl-2.5 text-[11px] shadow-sm transition-colors",
				!hasChairs && "border-dashed",
				isDragOver && "border-primary bg-accent ring-2 ring-primary",
			)}
			data-testid={`session-card-${data.sessionId}`}
			onDragEnter={(e) => {
				if (!e.dataTransfer.types.includes("submissionid")) return;
				e.preventDefault();
				setIsDragOver(true);
			}}
			onDragLeave={() => setIsDragOver(false)}
			onDragOver={(e) => {
				if (!e.dataTransfer.types.includes("submissionid")) return;
				e.preventDefault();
				e.stopPropagation();
				setIsDragOver(true);
			}}
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
			<span
				className="absolute left-0 top-0 h-full w-[3px]"
				style={{ backgroundColor: band }}
			/>

			{compact ? (
				<p
					className="whitespace-normal break-words font-semibold leading-tight text-foreground"
					data-testid="session-card-title"
				>
					{title}
				</p>
			) : (
				<>
					<div className="flex items-start justify-between gap-1">
						<div className="min-w-0 flex-1">
							<p
								className="truncate font-semibold leading-tight text-foreground"
								data-testid="session-card-title"
							>
								{title}
							</p>
							{data.trackName && (
								<p className="truncate text-[10px] text-muted-foreground">
									{data.trackName}
								</p>
							)}
						</div>
						<ChairStack chairs={data.chairs} />
					</div>
					{data.untimedSlots ? (
						<p
							className="mt-auto pt-1 text-[9px] text-muted-foreground/70"
							data-testid="session-card-capacity"
						>
							{data.presentations.length}{" "}
							{data.presentations.length === 1
								? "presentation"
								: "presentations"}{" "}
							· untimed
						</p>
					) : (
						<CapacityBar
							slotCount={data.presentations.length}
							totalMin={data.sessionDurationMin}
							usedMin={usedMin}
						/>
					)}
				</>
			)}
		</section>
	);
}
