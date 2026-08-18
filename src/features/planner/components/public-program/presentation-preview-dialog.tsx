import {
	IconArrowLeft,
	IconChevronRight,
	IconDownload,
	IconStar,
	IconStarFilled,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
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
	showAuthorInfo = false,
	initialAuthorOrderIndex = null,
}: {
	target: PreviewTarget | null;
	themeId: string;
	onOpenChange: (open: boolean) => void;
	canInteract: boolean;
	isFavorite: boolean;
	onToggleFavorite: () => void;
	showAuthorInfo?: boolean;
	initialAuthorOrderIndex?: number | null;
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
						showAuthorInfo={showAuthorInfo}
						initialAuthorOrderIndex={initialAuthorOrderIndex}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}

const PANEL = "grid gap-4 duration-300 ease-out motion-reduce:animate-none";

function PreviewBody({
	target,
	framed,
	canInteract,
	isFavorite,
	onToggleFavorite,
	showAuthorInfo,
	initialAuthorOrderIndex,
}: {
	target: PreviewTarget;
	framed: boolean;
	canInteract: boolean;
	isFavorite: boolean;
	onToggleFavorite: () => void;
	showAuthorInfo: boolean;
	initialAuthorOrderIndex: number | null;
}) {
	const [view, setView] = useState<{
		authorIndex: number | null;
		slide: "talk" | "author" | null;
	}>({ authorIndex: initialAuthorOrderIndex, slide: null });
	const openAuthor = (orderIndex: number) =>
		setView({ authorIndex: orderIndex, slide: "author" });

	if (view.authorIndex !== null) {
		return (
			<div
				key={`author-${view.authorIndex}`}
				className={cn(
					PANEL,
					view.slide === "author" &&
						"animate-in fade-in-0 slide-in-from-right-8",
				)}
			>
				<AuthorBody
					slotId={target.slotId}
					orderIndex={view.authorIndex}
					framed={framed}
					onBack={() => setView({ authorIndex: null, slide: "talk" })}
				/>
			</div>
		);
	}

	return (
		<div
			key="talk"
			className={cn(
				PANEL,
				view.slide === "talk" && "animate-in fade-in-0 slide-in-from-left-8",
			)}
		>
			<TalkHeader target={target} framed={framed} />

			<PreviewContent
				slotId={target.slotId}
				onSelectAuthor={showAuthorInfo ? openAuthor : undefined}
			/>

			<PreviewFooter
				slotId={target.slotId}
				canInteract={canInteract}
				isFavorite={isFavorite}
				onToggleFavorite={onToggleFavorite}
			/>
		</div>
	);
}

function TalkHeader({
	target,
	framed,
}: {
	target: PreviewTarget;
	framed: boolean;
}) {
	return (
		<DialogHeader className="pr-8 text-left">
			<div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1", META)}>
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
					{target.untimedEndISO &&
						`–${formatClockTime(new Date(target.untimedEndISO), target.tz)}`}
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

function PreviewContent({
	slotId,
	onSelectAuthor,
}: {
	slotId: string;
	onSelectAuthor?: (orderIndex: number) => void;
}) {
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
			{authors.length > 0 && (
				<Authors authors={authors} onSelect={onSelectAuthor} />
			)}
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

function Authors({
	authors,
	onSelect,
}: {
	authors: PresentationDetailAuthor[];
	onSelect?: (orderIndex: number) => void;
}) {
	return (
		<section className="space-y-2">
			<h3 className={HEADING}>Authors</h3>
			<div
				className={cn(
					"grid grid-cols-1 gap-2",
					authors.length > 1 && "sm:grid-cols-2",
				)}
			>
				{authors.map((author, index) => {
					const cardClass = cn(
						"flex items-start gap-3 rounded-[var(--radius)] border border-border bg-card p-3",
						author.isPresenter && "border-primary/40 bg-primary/5",
					);
					const inner = (
						<>
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
						</>
					);
					if (!onSelect) {
						return (
							<div key={author.orderIndex} className={cardClass}>
								{inner}
							</div>
						);
					}
					return (
						<button
							key={author.orderIndex}
							type="button"
							data-testid="author-card-button"
							aria-label={`Author info: ${author.firstName} ${author.lastName}`}
							onClick={() => onSelect(author.orderIndex)}
							className={cn(
								cardClass,
								"group cursor-pointer text-left transition-colors hover:border-primary/60 hover:bg-accent",
							)}
						>
							{inner}
							<IconChevronRight className="size-4 shrink-0 self-center text-muted-foreground transition-transform group-hover:translate-x-0.5" />
						</button>
					);
				})}
			</div>
		</section>
	);
}

function AuthorBody({
	slotId,
	orderIndex,
	framed,
	onBack,
}: {
	slotId: string;
	orderIndex: number;
	framed: boolean;
	onBack: () => void;
}) {
	const detail = useQuery(presentationDetailQueryOptions(slotId));
	const author =
		detail.data?.authors.find((a) => a.orderIndex === orderIndex) ?? null;

	return (
		<div data-testid="author-info" className="grid gap-4">
			<DialogHeader className="pr-8 text-left">
				<button
					type="button"
					data-testid="author-back"
					onClick={onBack}
					className={cn(BTN, BTN_IDLE, "self-start")}
				>
					<IconArrowLeft />
					Back to talk
				</button>
				<span className={META}>Author</span>
				<DialogTitle
					className={cn(
						"font-[var(--prog-font-display)] leading-snug",
						framed ? "text-2xl font-bold" : "text-lg font-semibold",
					)}
				>
					{author ? `${author.firstName} ${author.lastName}` : "Author"}
				</DialogTitle>
			</DialogHeader>
			{detail.isPending ? (
				<PreviewSkeleton />
			) : !author ? (
				<p className={ABSTRACT}>Author info is unavailable.</p>
			) : (
				<AuthorDetails author={author} />
			)}
		</div>
	);
}

function AuthorDetails({ author }: { author: PresentationDetailAuthor }) {
	return (
		<div className="space-y-4">
			{author.isPresenter && (
				<span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
					<IconStarFilled className="size-3" />
					Presenter
				</span>
			)}
			<section className="space-y-1">
				<h3 className={HEADING}>Affiliation</h3>
				<p className={ABSTRACT}>{affiliationDisplay(author.affiliationName)}</p>
			</section>
			{author.email && (
				<section className="space-y-1">
					<h3 className={HEADING}>Email</h3>
					<a
						data-testid="author-email"
						href={`mailto:${author.email}`}
						className="break-all text-sm text-foreground underline-offset-4 hover:underline"
					>
						{author.email}
					</a>
				</section>
			)}
			{author.orcid && (
				<section className="space-y-1">
					<h3 className={HEADING}>ORCID</h3>
					<a
						data-testid="author-orcid"
						href={`https://orcid.org/${author.orcid}`}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-2 text-sm text-foreground underline-offset-4 hover:underline"
					>
						<span
							aria-hidden
							className="flex size-4 items-center justify-center rounded-full bg-[#A6CE39] text-[8px] font-bold text-white"
						>
							iD
						</span>
						{author.orcid}
					</a>
				</section>
			)}
		</div>
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
