import { IconDownload, IconStar, IconStarFilled } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import type { CSSProperties } from "react";
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

interface DialogTheme {
	content: string;
	contentStyle?: CSSProperties;
	meta: string;
	metaStyle?: CSSProperties;
	title: string;
	titleStyle?: CSSProperties;
	session: string;
	heading: string;
	headingStyle?: CSSProperties;
	abstract: string;
	authorCard: string;
	authorCardPresenter: string;
	authorBadge: string;
	authorBadgePresenter: string;
	authorName: string;
	presenterTag: string;
	affiliation: string;
	keyword: string;
	footer: string;
	btnBase: string;
	btnIdle: string;
	btnActive: string;
	btnDisabled: string;
	star: string;
}

const BTN =
	"inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0";

const DEFAULT_THEME: DialogTheme = {
	content: "sm:max-w-2xl",
	meta: "text-xs uppercase tracking-wide text-muted-foreground",
	title: "text-lg font-semibold leading-snug",
	session: "text-sm text-muted-foreground",
	heading:
		"text-xs font-semibold uppercase tracking-wide text-muted-foreground",
	abstract: "text-sm leading-relaxed text-foreground",
	authorCard:
		"flex items-start gap-3 rounded-lg border border-border/50 bg-card p-3",
	authorCardPresenter: "border-primary/30 bg-primary/5",
	authorBadge:
		"flex size-6 shrink-0 items-center justify-center rounded-md bg-muted/50 text-xs font-semibold text-muted-foreground",
	authorBadgePresenter: "bg-primary/10 text-primary",
	authorName: "font-medium text-foreground",
	presenterTag:
		"inline-flex items-center gap-1 text-xs font-medium text-primary",
	affiliation: "mt-0.5 truncate text-sm text-muted-foreground",
	keyword:
		"rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground",
	footer: "",
	btnBase: cn(BTN, "rounded-lg border"),
	btnIdle: "border-border bg-background text-foreground hover:bg-muted",
	btnActive:
		"border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
	btnDisabled: "border-border bg-background text-foreground",
	star: "text-amber-500",
};

const EDITORIAL_THEME: DialogTheme = {
	content:
		"sm:max-w-2xl rounded-none border border-stone-300 bg-[#f5f1e8] text-stone-900 ring-stone-900/10 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100",
	contentStyle: { fontFamily: "var(--font-futuristic-body)" },
	meta: "text-[10px] uppercase tracking-[0.25em] text-stone-600 dark:text-stone-400",
	metaStyle: { fontFamily: "var(--font-sans)" },
	title: "text-2xl leading-tight",
	titleStyle: { fontFamily: "var(--font-editorial-display)", fontWeight: 700 },
	session: "text-sm italic text-stone-600 dark:text-stone-400",
	heading: "text-[10px] uppercase tracking-[0.25em] text-stone-500",
	headingStyle: { fontFamily: "var(--font-sans)" },
	abstract: "text-[15px] leading-relaxed text-stone-800 dark:text-stone-200",
	authorCard:
		"flex items-start gap-3 border border-stone-300 bg-stone-900/[0.02] p-3 dark:border-stone-700 dark:bg-stone-100/[0.02]",
	authorCardPresenter: "border-stone-400 dark:border-stone-500",
	authorBadge:
		"flex size-6 shrink-0 items-center justify-center bg-stone-200 text-xs font-semibold text-stone-700 dark:bg-stone-800 dark:text-stone-300",
	authorBadgePresenter:
		"bg-stone-800 text-stone-50 dark:bg-stone-200 dark:text-stone-900",
	authorName: "font-semibold text-stone-900 dark:text-stone-100",
	presenterTag:
		"inline-flex items-center gap-1 text-xs font-medium text-stone-700 dark:text-stone-300",
	affiliation:
		"mt-0.5 truncate text-sm italic text-stone-600 dark:text-stone-400",
	keyword:
		"border border-stone-400 px-2 py-0.5 text-xs text-stone-700 dark:border-stone-600 dark:text-stone-300",
	footer:
		"rounded-none border-stone-300 bg-stone-900/[0.03] dark:border-stone-700 dark:bg-stone-100/[0.03]",
	btnBase: cn(BTN, "rounded-none border"),
	btnIdle:
		"border-stone-400 bg-transparent text-stone-800 hover:bg-stone-900/5 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-100/5",
	btnActive:
		"border-stone-800 bg-stone-900 text-stone-50 dark:border-stone-200 dark:bg-stone-100 dark:text-stone-900",
	btnDisabled:
		"border-stone-300 text-stone-400 dark:border-stone-700 dark:text-stone-600",
	star: "text-amber-600",
};

function dialogTheme(themeId: string): DialogTheme {
	return themeId === "editorial" ? EDITORIAL_THEME : DEFAULT_THEME;
}

export function PresentationPreviewDialog({
	target,
	themeId,
	onOpenChange,
	isFavorite,
	onToggleFavorite,
}: {
	target: PreviewTarget | null;
	themeId: string;
	onOpenChange: (open: boolean) => void;
	isFavorite: boolean;
	onToggleFavorite: () => void;
}) {
	const t = dialogTheme(themeId);
	return (
		<Dialog open={!!target} onOpenChange={onOpenChange}>
			<DialogContent
				data-testid="presentation-preview"
				className={t.content}
				style={t.contentStyle}
			>
				{target && (
					<PreviewBody
						target={target}
						t={t}
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
	t,
	isFavorite,
	onToggleFavorite,
}: {
	target: PreviewTarget;
	t: DialogTheme;
	isFavorite: boolean;
	onToggleFavorite: () => void;
}) {
	return (
		<>
			<DialogHeader className="pr-8 text-left">
				<div
					className={cn("flex flex-wrap items-center gap-x-3 gap-y-1", t.meta)}
					style={t.metaStyle}
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
				<DialogTitle className={t.title} style={t.titleStyle}>
					{target.submissionTitle}
				</DialogTitle>
				<p className={t.session}>{target.sessionTitle}</p>
			</DialogHeader>

			<PreviewContent slotId={target.slotId} t={t} />

			<DialogFooter className={cn("sm:justify-between", t.footer)}>
				<button
					type="button"
					data-testid="favorite-toggle"
					onClick={onToggleFavorite}
					className={cn(t.btnBase, isFavorite ? t.btnActive : t.btnIdle)}
				>
					{isFavorite ? <IconStarFilled className={t.star} /> : <IconStar />}
					{isFavorite ? "Favorited" : "Add to favorites"}
				</button>
				{/* ponytail: placeholder, wire when camera-ready download exists */}
				<button
					type="button"
					disabled
					title="Coming soon"
					className={cn(t.btnBase, t.btnDisabled)}
				>
					<IconDownload />
					Download camera-ready
				</button>
			</DialogFooter>
		</>
	);
}

function PreviewContent({ slotId, t }: { slotId: string; t: DialogTheme }) {
	const detail = useQuery(presentationDetailQueryOptions(slotId));

	if (detail.isPending) {
		return (
			<div className="max-h-[55vh] space-y-5 overflow-y-auto">
				<PreviewSkeleton />
			</div>
		);
	}
	if (!detail.data) {
		return <p className={t.abstract}>Preview is unavailable for this talk.</p>;
	}

	const { authors, content, keywords } = detail.data;
	return (
		<div className="max-h-[55vh] space-y-5 overflow-y-auto">
			{authors.length > 0 && <Authors authors={authors} t={t} />}
			<section className="space-y-2">
				<h3 className={t.heading} style={t.headingStyle}>
					Abstract
				</h3>
				<div className={cn("whitespace-pre-line break-words", t.abstract)}>
					{content}
				</div>
			</section>
			{keywords.length > 0 && (
				<section className="flex flex-wrap gap-2">
					{keywords.map((k) => (
						<span key={k} className={t.keyword}>
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
	t,
}: {
	authors: PresentationDetailAuthor[];
	t: DialogTheme;
}) {
	return (
		<section className="space-y-2">
			<h3 className={t.heading} style={t.headingStyle}>
				Authors
			</h3>
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
							t.authorCard,
							author.isPresenter && t.authorCardPresenter,
						)}
					>
						<div
							className={cn(
								t.authorBadge,
								author.isPresenter && t.authorBadgePresenter,
							)}
						>
							{index + 1}
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex flex-wrap items-center gap-2">
								<span className={t.authorName}>
									{author.firstName} {author.lastName}
								</span>
								{author.isPresenter && (
									<span className={t.presenterTag}>
										<IconStarFilled className="size-3" />
										Presenter
									</span>
								)}
							</div>
							<p className={t.affiliation}>
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
