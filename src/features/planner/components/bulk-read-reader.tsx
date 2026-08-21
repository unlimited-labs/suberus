import {
	IconArrowLeft,
	IconArrowRight,
	IconDownload,
	IconX,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import type { UnscheduledSubmission } from "@/features/planner/server/sessions";
import { Dialog, DialogContent } from "@/shared/ui/dialog";

interface BulkReadReaderProps {
	submissions: UnscheduledSubmission[];
	initialIndex?: number;
	onClose: () => void;
}

export function BulkReadReader({
	submissions,
	initialIndex = 0,
	onClose,
}: BulkReadReaderProps) {
	const [idx, setIdx] = useState(initialIndex);
	const closeRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
			else if (e.key === "ArrowRight" || e.key === " ")
				setIdx((i) => Math.min(submissions.length - 1, i + 1));
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [submissions.length]);

	if (submissions.length === 0) return null;
	const safe = Math.min(idx, submissions.length - 1);
	const s = submissions[safe];

	const authorLine = s.authors
		.map((a) => `${a.firstName} ${a.lastName}`)
		.join(", ");

	return (
		<Dialog
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
			open
		>
			<DialogContent
				aria-label="Read submissions"
				className="fixed inset-0 flex max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none bg-background p-0 ring-0 sm:max-w-none"
				data-testid="bulk-reader"
				initialFocus={closeRef}
				showCloseButton={false}
				style={{ animation: "none" }}
			>
				<div className="flex items-center gap-3 border-b px-4 py-2">
					<span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
						Reading mode
					</span>
					<span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">
						{safe + 1} / {submissions.length}
					</span>
					<span className="ml-auto text-[11px] text-muted-foreground">
						← → navigate · Esc to close
					</span>
					<button
						aria-label="Close reading mode"
						className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
						data-testid="bulk-reader-close"
						onClick={onClose}
						ref={closeRef}
						type="button"
					>
						<IconX size={16} />
					</button>
				</div>

				<div className="flex flex-1 overflow-hidden">
					<button
						aria-label="Previous"
						className="flex w-12 shrink-0 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-20 disabled:hover:bg-transparent"
						data-testid="bulk-reader-prev"
						disabled={safe === 0}
						onClick={() => setIdx((i) => Math.max(0, i - 1))}
						type="button"
					>
						<IconArrowLeft size={20} />
					</button>

					<article className="mx-auto flex max-w-3xl flex-1 flex-col gap-4 overflow-y-auto px-6 py-8">
						<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
							<span className="rounded bg-muted px-1.5 py-0.5 font-medium uppercase tracking-wide">
								{s.type}
							</span>
							{s.trackName && (
								<span className="rounded bg-muted px-1.5 py-0.5">
									{s.trackName}
								</span>
							)}
							{s.keywords.slice(0, 6).map((k) => (
								<span className="text-muted-foreground/70" key={k.id}>
									#{k.name}
								</span>
							))}
						</div>
						<h1 className="text-2xl font-semibold leading-tight">{s.title}</h1>
						{authorLine && (
							<p className="text-sm text-muted-foreground">{authorLine}</p>
						)}
						{s.file && (
							<a
								className="inline-flex w-fit items-center gap-1.5 rounded border px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
								data-testid={`bulk-reader-download-${s.id}`}
								download={s.file.originalName}
								href={`/api/files/${s.file.id}`}
							>
								<IconDownload size={12} />
								<span className="max-w-[320px] truncate">
									{s.file.originalName}
								</span>
							</a>
						)}
						{s.abstract ? (
							<div className="whitespace-pre-wrap text-[15px] leading-relaxed">
								{s.abstract}
							</div>
						) : (
							<p className="text-sm italic text-muted-foreground">
								No abstract available
							</p>
						)}
					</article>

					<button
						aria-label="Next"
						className="flex w-12 shrink-0 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-20 disabled:hover:bg-transparent"
						data-testid="bulk-reader-next"
						disabled={safe === submissions.length - 1}
						onClick={() =>
							setIdx((i) => Math.min(submissions.length - 1, i + 1))
						}
						type="button"
					>
						<IconArrowRight size={20} />
					</button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
