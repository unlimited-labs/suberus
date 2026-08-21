import { IconEye, IconSearch, IconX } from "@tabler/icons-react";
import type { CSSProperties } from "react";
import { cn } from "@/shared/lib/utils";
import { Input } from "@/shared/ui/input";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { GridBody } from "./layouts/grid-body";
import { ListBody } from "./layouts/list-body";
import { dayLabelParts, formatLongDate } from "./program-formatting";
import type {
	ProgramChrome,
	ProgramLayout,
	ProgramThemeProps,
} from "./themes/registry";
import { ProgramAuthLink, ProgramPwaStatus } from "./themes/shared";

const RULE_STYLE: CSSProperties = {
	borderColor: "var(--prog-rule)",
	borderTopWidth: "var(--prog-rule-width)",
	// SAFETY: the record holds only CSS custom properties.
	borderTopStyle: "var(--prog-rule-style)" as CSSProperties["borderTopStyle"],
};
const HEADER_RULE_STYLE: CSSProperties = {
	borderColor: "var(--prog-rule)",
	borderBottomWidth: "var(--prog-rule-width)",
	borderBottomStyle:
		// SAFETY: the record holds only CSS custom properties.
		"var(--prog-rule-style)" as CSSProperties["borderBottomStyle"],
};

export interface ProgramShellProps extends ProgramThemeProps {
	themeId: string;
	chrome: ProgramChrome;
	layout: ProgramLayout;
}

export function ProgramShell({
	themeId,
	chrome,
	layout,
	settings,
	search,
	setSearch,
	activeDay,
	setActiveDay,
	schedule,
}: ProgramShellProps) {
	const framed = chrome === "framed";
	const { days, activeItems, q } = schedule;
	const mainClass =
		layout === "grid"
			? "w-full py-8 sm:py-12"
			: framed
				? "mx-auto max-w-[var(--prog-max-width)] px-5 py-8 sm:px-10 sm:py-12"
				: "mx-auto max-w-[var(--prog-max-width)] px-5 py-8 sm:px-8";

	return (
		<TooltipProvider>
			<div
				className="bg-background text-foreground selection:bg-primary selection:text-primary-foreground h-screen overflow-y-auto font-[var(--prog-font-body)]"
				data-program-theme={themeId}
				data-testid={`program-theme-${themeId}`}
			>
				{settings.isDraftPreview && <ProgramDraftNotice />}

				{framed ? (
					<FramedHeader settings={settings} themeId={themeId} />
				) : (
					<MinimalHeader settings={settings} />
				)}

				<ProgramStickyBar
					activeDay={activeDay}
					days={days}
					framed={framed}
					search={search}
					setActiveDay={setActiveDay}
					setSearch={setSearch}
				/>

				<main className={mainClass}>
					{activeItems.length === 0 ? (
						<EmptyState framed={framed} searching={!!q} />
					) : layout === "grid" ? (
						<GridBody schedule={schedule} />
					) : (
						<ListBody framed={framed} schedule={schedule} />
					)}
				</main>

				{framed && <FramedFooter settings={settings} themeId={themeId} />}
			</div>
		</TooltipProvider>
	);
}

function ProgramDraftNotice() {
	return (
		<div
			className="flex items-start gap-2.5 border-b border-amber-300 bg-amber-50 px-5 py-2.5 text-amber-800 sm:px-8 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
			data-testid="program-draft-notice"
			role="status"
		>
			<IconEye className="mt-0.5 shrink-0" size={16} />
			<p className="text-sm leading-snug">
				<span className="font-semibold">Draft preview</span> - this programme
				has not been published yet. Only conference staff can see this page.
			</p>
		</div>
	);
}

function ProgramStickyBar({
	framed,
	days,
	activeDay,
	setActiveDay,
	search,
	setSearch,
}: {
	framed: boolean;
	days: Date[];
	activeDay: number;
	setActiveDay: (i: number) => void;
	search: string;
	setSearch: (value: string) => void;
}) {
	return (
		<div
			className={cn(
				"sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur",
				framed && "bg-background/95",
			)}
		>
			<div
				className={cn(
					"mx-auto flex max-w-[var(--prog-max-width)] flex-col gap-3 px-5 sm:flex-row sm:items-center sm:justify-between",
					framed ? "py-2 sm:gap-4 sm:px-10 sm:py-2.5" : "py-3 sm:px-8",
				)}
			>
				{days.length > 0 &&
					(framed ? (
						<FramedNav
							activeDay={activeDay}
							days={days}
							setActiveDay={setActiveDay}
						/>
					) : (
						<MinimalNav
							activeDay={activeDay}
							days={days}
							setActiveDay={setActiveDay}
						/>
					))}
				<SearchBox framed={framed} search={search} setSearch={setSearch} />
			</div>
		</div>
	);
}

function MinimalHeader({
	settings,
}: {
	settings: ProgramThemeProps["settings"];
}) {
	return (
		<header className="border-border border-b">
			<div className="mx-auto max-w-[var(--prog-max-width)] px-5 pt-10 pb-6 sm:px-8 sm:pt-14">
				<div className="mb-4 flex items-center justify-end gap-4">
					<ProgramPwaStatus className="text-muted-foreground" />
					<ProgramAuthLink
						className="text-muted-foreground hover:text-primary text-sm font-medium transition-colors"
						labelClassName="hidden sm:inline"
					/>
				</div>
				{settings.startDate && (
					<p className="text-primary text-xs font-medium tracking-[0.2em] uppercase">
						{formatLongDate(settings.startDate)}
					</p>
				)}
				<h1 className="text-foreground mt-3 text-3xl font-[var(--prog-font-display)] font-bold tracking-tight sm:text-5xl">
					{settings.name || "Conference"}
				</h1>
				{settings.subtitle && (
					<p className="text-muted-foreground mt-2 max-w-2xl text-base sm:text-lg">
						{settings.subtitle}
					</p>
				)}
			</div>
		</header>
	);
}

function FramedHeader({
	themeId,
	settings,
}: {
	themeId: string;
	settings: ProgramThemeProps["settings"];
}) {
	const dividerLabel =
		themeId === "academic" ? "Conference Programme" : "◆ Programme ◆";
	const dividerClass =
		themeId === "academic"
			? "text-primary text-[10px] tracking-[0.35em]"
			: "text-[var(--prog-faint)] text-[10px] sm:text-[11px] tracking-[0.3em] sm:tracking-[0.4em]";

	return (
		<header className="border-b" style={HEADER_RULE_STYLE}>
			<div className="mx-auto max-w-[var(--prog-max-width)] px-5 pt-4 pb-3 sm:px-10 sm:pt-12 sm:pb-7">
				<div className="border-border text-muted-foreground flex items-center justify-end gap-4 border-b pb-2">
					<ProgramPwaStatus />
					<ProgramAuthLink
						className="hover:text-foreground text-sm transition-colors"
						labelClassName="hidden sm:inline"
					/>
				</div>
				<h1 className="text-foreground mt-4 text-3xl leading-[1.02] font-[var(--prog-font-display)] font-extrabold tracking-tight break-words sm:mt-5 sm:text-5xl md:text-6xl">
					{settings.name || "Conference"}
				</h1>
				{settings.subtitle && (
					<p className="text-muted-foreground mt-2 max-w-3xl text-base leading-snug sm:text-xl">
						{settings.subtitle}
					</p>
				)}
				<div className="mt-4 flex items-center gap-4 sm:mt-5">
					<span className="bg-border h-px flex-1" />
					<span
						className={cn(
							"font-[var(--prog-font-meta)] uppercase",
							dividerClass,
						)}
					>
						{dividerLabel}
					</span>
					<span className="bg-border h-px flex-1" />
				</div>
			</div>
		</header>
	);
}

function FramedFooter({
	themeId,
	settings,
}: {
	themeId: string;
	settings: ProgramThemeProps["settings"];
}) {
	return (
		<footer
			className={cn(
				"border-t text-center",
				themeId === "academic" ? "py-4" : "py-8",
			)}
			style={RULE_STYLE}
		>
			<div className="text-[10px] font-[var(--prog-font-meta)] tracking-[0.3em] text-[var(--prog-faint)] uppercase">
				{themeId === "academic" ? settings.name || "Conference" : "— Fin —"}
			</div>
		</footer>
	);
}

function MinimalNav({
	days,
	activeDay,
	setActiveDay,
}: {
	days: Date[];
	activeDay: number;
	setActiveDay: (i: number) => void;
}) {
	return (
		<nav
			aria-label="Select day"
			className="-mx-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:px-0"
			style={{ scrollbarWidth: "none" }}
		>
			{days.map((day, i) => {
				const label = dayLabelParts(day);
				const isActive = activeDay === i;
				return (
					<button
						className={cn(
							"flex shrink-0 items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition-colors",
							isActive
								? "border-primary bg-primary text-primary-foreground"
								: "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
						)}
						key={day.toISOString()}
						onClick={() => setActiveDay(i)}
						type="button"
					>
						<span className="text-base font-semibold tabular-nums">
							{label.dayNum}
						</span>
						<span className="text-xs tracking-wide uppercase">
							{label.weekday.slice(0, 3)} {label.month.slice(0, 3)}
						</span>
					</button>
				);
			})}
		</nav>
	);
}

function FramedNav({
	days,
	activeDay,
	setActiveDay,
}: {
	days: Date[];
	activeDay: number;
	setActiveDay: (i: number) => void;
}) {
	return (
		<nav
			aria-label="Select day"
			className="-mx-5 flex items-stretch gap-0 overflow-x-auto px-5 sm:mx-0 sm:overflow-visible sm:px-0"
			style={{ scrollbarWidth: "none" }}
		>
			{days.map((day, i) => {
				const label = dayLabelParts(day);
				const isActive = activeDay === i;
				return (
					<button
						className={cn(
							"group relative flex shrink-0 items-baseline gap-2 px-3 py-1.5 text-left whitespace-nowrap transition-colors first:pl-0 sm:py-2",
							isActive
								? "text-primary"
								: "text-[var(--prog-faint)] hover:text-foreground",
						)}
						key={day.toISOString()}
						onClick={() => setActiveDay(i)}
						type="button"
					>
						<span className="text-2xl leading-none font-[var(--prog-font-display)] font-extrabold tabular-nums sm:text-3xl">
							{label.dayNum}
						</span>
						<span className="flex flex-col leading-tight font-[var(--prog-font-meta)]">
							<span className="text-[10px] tracking-[0.2em] uppercase">
								{label.weekday.slice(0, 3)}
							</span>
							<span className="text-[10px] tracking-[0.15em] text-[var(--prog-faint)] uppercase">
								{label.month.slice(0, 3)}
							</span>
						</span>
						{isActive && (
							<span className="bg-primary absolute -bottom-[13px] left-0 h-[2px] w-full sm:-bottom-[10px]" />
						)}
					</button>
				);
			})}
		</nav>
	);
}

function SearchBox({
	framed,
	search,
	setSearch,
}: {
	framed: boolean;
	search: string;
	setSearch: (value: string) => void;
}) {
	return (
		<div className="relative w-full sm:w-72 sm:shrink-0">
			<IconSearch
				className={cn(
					"absolute top-1/2 -translate-y-1/2 text-muted-foreground",
					framed ? "left-0" : "left-3",
				)}
				size={framed ? 13 : 15}
			/>
			<Input
				className={cn(
					framed
						? "rounded-none border-0 border-b border-border bg-transparent pr-8 pl-6 text-base shadow-none focus-visible:border-primary focus-visible:ring-0 sm:text-sm"
						: "pr-9 pl-9",
				)}
				onChange={(e) => setSearch(e.target.value)}
				placeholder="Search talks, authors, tracks…"
				value={search}
			/>
			{search && (
				<button
					aria-label="Clear search"
					className={cn(
						"absolute top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground",
						framed ? "right-1" : "right-2",
					)}
					onClick={() => setSearch("")}
					type="button"
				>
					<IconX size={framed ? 14 : 15} />
				</button>
			)}
		</div>
	);
}

function EmptyState({
	framed,
	searching,
}: {
	framed: boolean;
	searching: boolean;
}) {
	const message = searching
		? "Nothing matches your search on this day."
		: "Nothing scheduled for this day.";
	return (
		<p
			className={cn(
				"text-center text-muted-foreground",
				framed ? "py-16 text-lg sm:py-24 sm:text-xl" : "py-20 text-lg",
			)}
		>
			{message}
		</p>
	);
}
