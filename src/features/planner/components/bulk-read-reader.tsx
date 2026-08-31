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
				className="bg-background fixed inset-0 flex max-w-none translate-0 flex-col gap-0 rounded-none p-0 ring-0 sm:max-w-none"
				data-testid="bulk-reader"
				initialFocus={closeRef}
				showCloseButton={false}
				style={{ animation: "none" }}
			>
				<div className="flex items-center gap-3 border-b px-4 py-2">
					<span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
						Reading mode
					</span>
					<span className="bg-muted rounded-full px-2 py-0.5 text-xs tabular-nums">
						{safe + 1} / {submissions.length}
					</span>
					<span className="text-muted-foreground ml-auto text-[11px]">
						← → navigate · Esc to close
					</span>
					<button
						aria-label="Close reading mode"
						className="text-muted-foreground hover:bg-muted hover:text-foreground focus:ring-ring rounded p-1 focus:ring-2 focus:ring-offset-2 focus:outline-none"
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
						className="text-muted-foreground hover:bg-muted hover:text-foreground flex w-12 shrink-0 items-center justify-center disabled:opacity-20 hover:disabled:bg-transparent"
						data-testid="bulk-reader-prev"
						disabled={safe === 0}
						onClick={() => setIdx((i) => Math.max(0, i - 1))}
						type="button"
					>
						<IconArrowLeft size={20} />
					</button>

					<article className="fade-y mx-auto flex max-w-3xl flex-1 flex-col gap-4 overflow-y-auto px-6 py-8">
						<div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
							<span className="bg-muted rounded px-1.5 py-0.5 font-medium tracking-wide uppercase">
								{s.type}
							</span>
							{s.trackName && (
								<span className="bg-muted rounded px-1.5 py-0.5">
									{s.trackName}
								</span>
							)}
							{s.keywords.slice(0, 6).map((k) => (
								<span className="text-muted-foreground/70" key={k.id}>
									#{k.name}
								</span>
							))}
						</div>
						<h1 className="text-2xl leading-tight font-semibold">{s.title}</h1>
						{authorLine && (
							<p className="text-muted-foreground text-sm">{authorLine}</p>
						)}
						{s.file && (
							<a
								className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex w-fit items-center gap-1.5 rounded border px-2 py-1 text-xs"
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
							<div className="text-[15px] leading-relaxed whitespace-pre-wrap">
								{s.abstract}
							</div>
						) : (
							<p className="text-muted-foreground text-sm italic">
								No abstract available
							</p>
						)}
					</article>

					<button
						aria-label="Next"
						className="text-muted-foreground hover:bg-muted hover:text-foreground flex w-12 shrink-0 items-center justify-center disabled:opacity-20 hover:disabled:bg-transparent"
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
