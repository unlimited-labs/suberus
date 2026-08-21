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
import { resolveProgramTheme } from "./themes/registry";

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
	const framed = resolveProgramTheme(themeId).chrome === "framed";
	return (
		<Dialog onOpenChange={onOpenChange} open={!!target}>
			<DialogContent
				className="bg-background text-foreground font-[var(--prog-font-body)] sm:max-w-2xl"
				data-program-theme={themeId}
				data-testid="presentation-preview"
			>
				{target && (
					<PreviewBody
						canInteract={canInteract}
						framed={framed}
						initialAuthorOrderIndex={initialAuthorOrderIndex}
						isFavorite={isFavorite}
						onToggleFavorite={onToggleFavorite}
						showAuthorInfo={showAuthorInfo}
						target={target}
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
				className={cn(
					PANEL,
					view.slide === "author" &&
						"animate-in fade-in-0 slide-in-from-right-8",
				)}
				key={`author-${view.authorIndex}`}
			>
				<AuthorBody
					framed={framed}
					onBack={() => setView({ authorIndex: null, slide: "talk" })}
					orderIndex={view.authorIndex}
					slotId={target.slotId}
				/>
			</div>
		);
	}

	return (
		<div
			className={cn(
				PANEL,
				view.slide === "talk" && "animate-in fade-in-0 slide-in-from-left-8",
			)}
			key="talk"
		>
			<TalkHeader framed={framed} target={target} />

			<PreviewContent
				onSelectAuthor={showAuthorInfo ? openAuthor : undefined}
				slotId={target.slotId}
			/>

			<PreviewFooter
				canInteract={canInteract}
				isFavorite={isFavorite}
				onToggleFavorite={onToggleFavorite}
				slotId={target.slotId}
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
							aria-hidden
							className="size-2 rounded-full"
							style={{
								backgroundColor: target.track.color ?? "var(--primary)",
							}}
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
			<p className="text-muted-foreground text-sm">{target.sessionTitle}</p>
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
					className={cn(BTN, isFavorite ? BTN_ACTIVE : BTN_IDLE)}
					data-testid="favorite-toggle"
					onClick={onToggleFavorite}
					type="button"
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
					className={cn(BTN, BTN_IDLE, "sm:ml-auto")}
					data-testid="camera-ready-download"
					download
					href={cameraReadyUrl}
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
			{content && (
				<section className="space-y-2">
					<h3 className={HEADING}>Abstract</h3>
					<div className={cn("whitespace-pre-line break-words", ABSTRACT)}>
						{content}
					</div>
				</section>
			)}
			{keywords.length > 0 && (
				<section className="flex flex-wrap gap-2">
					{keywords.map((k) => (
						<span
							className="bg-secondary text-secondary-foreground rounded-[var(--radius)] px-2 py-0.5 text-xs font-medium"
							key={k}
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
						"flex h-full items-start gap-3 rounded-[var(--radius)] border border-border bg-card p-3",
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
									<span className="text-foreground font-medium">
										{author.firstName} {author.lastName}
									</span>
									{author.isPresenter && (
										<span className="text-primary inline-flex items-center gap-1 text-xs font-medium">
											<IconStarFilled className="size-3" />
											Presenter
										</span>
									)}
								</div>
								<p className="text-muted-foreground mt-0.5 text-xs leading-snug break-words">
									{affiliationDisplay(author.affiliationName)}
								</p>
							</div>
						</>
					);
					if (!onSelect) {
						return (
							<div className={cardClass} key={author.orderIndex}>
								{inner}
							</div>
						);
					}
					return (
						<button
							aria-label={`Author info: ${author.firstName} ${author.lastName}`}
							className={cn(
								cardClass,
								"group cursor-pointer text-left transition-colors hover:border-primary/60 hover:bg-accent",
							)}
							data-testid="author-card-button"
							key={author.orderIndex}
							onClick={() => onSelect(author.orderIndex)}
							type="button"
						>
							{inner}
							<IconChevronRight className="text-muted-foreground size-4 shrink-0 self-center transition-transform group-hover:translate-x-0.5" />
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
		<div className="grid gap-4" data-testid="author-info">
			<DialogHeader className="pr-8 text-left">
				<button
					className={cn(BTN, BTN_IDLE, "self-start")}
					data-testid="author-back"
					onClick={onBack}
					type="button"
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
				<span className="text-primary inline-flex items-center gap-1 text-xs font-medium">
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
						className="text-foreground text-sm break-all underline-offset-4 hover:underline"
						data-testid="author-email"
						href={`mailto:${author.email}`}
					>
						{author.email}
					</a>
				</section>
			)}
			{author.orcid && (
				<section className="space-y-1">
					<h3 className={HEADING}>ORCID</h3>
					<a
						className="text-foreground inline-flex items-center gap-2 text-sm underline-offset-4 hover:underline"
						data-testid="author-orcid"
						href={`https://orcid.org/${author.orcid}`}
						rel="noopener noreferrer"
						target="_blank"
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
