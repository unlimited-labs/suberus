import { IconDownload, IconStar, IconStarFilled } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import {
	type PresentationDetailAuthor,
	presentationDetailQueryOptions,
} from "@/features/planner/api/favorites";
import { formatClockTime } from "@/features/planner/tz-datetime";
import { affiliationDisplay } from "@/shared/components/author-card-styles";
import { cn } from "@/shared/lib/utils";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";
import { Skeleton } from "@/shared/ui/skeleton";
import type { PreviewTarget } from "./program-interaction";

const META =
	"font-[var(--prog-font-meta)] text-xs uppercase tracking-[var(--prog-tracking)] text-muted-foreground";
const HEADING =
	"font-[var(--prog-font-meta)] text-xs font-semibold uppercase tracking-[var(--prog-tracking)] text-muted-foreground";
const ABSTRACT = "text-sm leading-relaxed text-foreground";
const BTN =
	"inline-flex items-center justify-center gap-2 rounded-[var(--radius)] border px-3 py-1.5 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0";
const BTN_IDLE = "border-border bg-background text-foreground hover:bg-muted";
const BTN_ACTIVE =
	"border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80";

export function PresentationPreviewDialog({
	target,
	themeId,
	onOpenChange,
	canInteract,
	isFavorite,
	onToggleFavorite,
}: {
	target: PreviewTarget | null;
	themeId: string;
	onOpenChange: (open: boolean) => void;
	canInteract: boolean;
	isFavorite: boolean;
	onToggleFavorite: () => void;
}) {
	const framed = themeId !== "default";
	return (
		<Dialog open={!!target} onOpenChange={onOpenChange}>
			<DialogContent
				data-program-theme={themeId}
				data-testid="presentation-preview"
				className="bg-background text-foreground font-[var(--prog-font-body)] sm:max-w-2xl"
			>
				{target && (
					<PreviewBody
						target={target}
						framed={framed}
						canInteract={canInteract}
						isFavorite={isFavorite}
						onToggleFavorite={onToggleFavorite}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}

function PreviewBody({
	target,
	framed,
	canInteract,
	isFavorite,
	onToggleFavorite,
}: {
	target: PreviewTarget;
	framed: boolean;
	canInteract: boolean;
	isFavorite: boolean;
	onToggleFavorite: () => void;
}) {
	return (
		<>
			<DialogHeader className="pr-8 text-left">
				<div
					className={cn("flex flex-wrap items-center gap-x-3 gap-y-1", META)}
				>
					{target.track && (
						<span className="inline-flex items-center gap-1.5">
							<span
								className="size-2 rounded-full"
								style={{
									backgroundColor: target.track.color ?? "var(--primary)",
								}}
								aria-hidden
							/>
							{target.track.name}
						</span>
					)}
					<span className="tabular-nums">
						{formatClockTime(new Date(target.startAtISO), target.tz)}
					</span>
					{target.roomName && <span>{target.roomName}</span>}
				</div>
				<DialogTitle
					className={cn(
						"font-[var(--prog-font-display)] leading-snug",
						framed ? "text-2xl font-bold" : "text-lg font-semibold",
					)}
				>
					{target.submissionTitle}
				</DialogTitle>
				<p className="text-sm text-muted-foreground">{target.sessionTitle}</p>
			</DialogHeader>

			<PreviewContent slotId={target.slotId} />

			<PreviewFooter
				slotId={target.slotId}
				canInteract={canInteract}
				isFavorite={isFavorite}
				onToggleFavorite={onToggleFavorite}
			/>
		</>
	);
}

function PreviewFooter({
	slotId,
	canInteract,
	isFavorite,
	onToggleFavorite,
}: {
	slotId: string;
	canInteract: boolean;
	isFavorite: boolean;
	onToggleFavorite: () => void;
}) {
	const detail = useQuery(presentationDetailQueryOptions(slotId));
	const cameraReadyUrl = detail.data?.cameraReadyUrl ?? null;
	return (
		<DialogFooter className="sm:justify-between">
			{canInteract && (
				<button
					type="button"
					data-testid="favorite-toggle"
					onClick={onToggleFavorite}
					className={cn(BTN, isFavorite ? BTN_ACTIVE : BTN_IDLE)}
				>
					{isFavorite ? (
						<IconStarFilled className="text-amber-500" />
					) : (
						<IconStar />
					)}
					{isFavorite ? "Favorited" : "Add to favorites"}
				</button>
			)}
			{cameraReadyUrl && (
				<a
					href={cameraReadyUrl}
					download
					data-testid="camera-ready-download"
					className={cn(BTN, BTN_IDLE, "sm:ml-auto")}
				>
					<IconDownload />
					Download camera-ready
				</a>
			)}
		</DialogFooter>
	);
}

function PreviewContent({ slotId }: { slotId: string }) {
	const detail = useQuery(presentationDetailQueryOptions(slotId));

	if (detail.isPending) {
		return (
			<div className="max-h-[55vh] space-y-5 overflow-y-auto">
				<PreviewSkeleton />
			</div>
		);
	}
	if (!detail.data) {
		return <p className={ABSTRACT}>Preview is unavailable for this talk.</p>;
	}

	const { authors, content, keywords } = detail.data;
	return (
		<div className="max-h-[55vh] space-y-5 overflow-y-auto">
			{authors.length > 0 && <Authors authors={authors} />}
			<section className="space-y-2">
				<h3 className={HEADING}>Abstract</h3>
				<div className={cn("whitespace-pre-line break-words", ABSTRACT)}>
					{content}
				</div>
			</section>
			{keywords.length > 0 && (
				<section className="flex flex-wrap gap-2">
					{keywords.map((k) => (
						<span
							key={k}
							className="rounded-[var(--radius)] bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
						>
							{k}
						</span>
					))}
				</section>
			)}
		</div>
	);
}

function Authors({ authors }: { authors: PresentationDetailAuthor[] }) {
	return (
		<section className="space-y-2">
			<h3 className={HEADING}>Authors</h3>
			<div
				className={cn(
					"grid grid-cols-1 gap-2",
					authors.length > 1 && "sm:grid-cols-2",
				)}
			>
				{authors.map((author, index) => (
					<div
						key={index}
						className={cn(
							"flex items-start gap-3 rounded-[var(--radius)] border border-border bg-card p-3",
							author.isPresenter && "border-primary/40 bg-primary/5",
						)}
					>
						<div
							className={cn(
								"flex size-6 shrink-0 items-center justify-center rounded-[var(--radius)] bg-muted text-xs font-semibold text-muted-foreground",
								author.isPresenter && "bg-primary/10 text-primary",
							)}
						>
							{index + 1}
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex flex-wrap items-center gap-2">
								<span className="font-medium text-foreground">
									{author.firstName} {author.lastName}
								</span>
								{author.isPresenter && (
									<span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
										<IconStarFilled className="size-3" />
										Presenter
									</span>
								)}
							</div>
							<p className="mt-0.5 truncate text-sm text-muted-foreground">
								{affiliationDisplay(author.affiliationName)}
							</p>
						</div>
					</div>
				))}
			</div>
		</section>
	);
}

function PreviewSkeleton() {
	return (
		<div className="space-y-3">
			<Skeleton className="h-12 w-full" />
			<Skeleton className="h-4 w-3/4" />
			<Skeleton className="h-4 w-full" />
			<Skeleton className="h-4 w-full" />
			<Skeleton className="h-4 w-2/3" />
		</div>
	);
}
