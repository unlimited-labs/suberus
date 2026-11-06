import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";
import {
	buildAuthorIndex,
	type ExportFormat,
	formatTime,
	LABELS,
	PAGE_MM,
	type PreviewDay,
	type PrintOptions,
} from "./prototype-model";

export interface PreviewProps {
	format: ExportFormat;
	options: PrintOptions;
	days: PreviewDay[];
	tz: string;
	conferenceName: string;
	dates: string;
	draft: boolean;
	pageWidth: number;
	direction?: "column" | "row" | "grid";
}

interface PageSpec {
	key: string;
	label: string;
	landscape: boolean;
	body: ReactNode;
}

function Page({
	spec,
	options,
	draft,
	width,
	footer,
}: {
	spec: PageSpec;
	options: PrintOptions;
	draft: boolean;
	width: number;
	footer: string;
}) {
	const [w, h] = PAGE_MM[options.bookSize];
	const [pw, ph] = spec.landscape ? [h, w] : [w, h];
	const scale = width / pw;
	return (
		<figure className="shrink-0 space-y-1">
			<div
				className="relative overflow-hidden bg-white text-black shadow-md ring-1 ring-black/10"
				style={{ width, height: ph * scale }}
			>
				<div
					className="absolute top-0 left-0 origin-top-left p-[12mm] font-[Arial,sans-serif] text-[9pt]"
					style={{
						width: `${pw}mm`,
						height: `${ph}mm`,
						transform: `scale(${scale / 3.7795})`,
					}}
				>
					{draft && (
						<div className="pointer-events-none absolute inset-0 flex [transform:rotate(-30deg)] items-center justify-center text-[90pt] font-bold text-black/10">
							DRAFT
						</div>
					)}
					<div className="relative">{spec.body}</div>
					<div className="absolute inset-x-[12mm] bottom-[8mm] text-[7pt] text-black/60">
						{footer}
					</div>
				</div>
			</div>
			<figcaption className="text-muted-foreground text-[11px]">
				{spec.label}
				{spec.landscape ? " · landscape" : ""}
			</figcaption>
		</figure>
	);
}

function trackBar(color: string | null | undefined, on: boolean) {
	return on && color ? { borderLeft: `3pt solid ${color}` } : undefined;
}

function GlanceGrid({
	day,
	options,
	tz,
}: {
	day: PreviewDay;
	options: PrintOptions;
	tz: string;
}) {
	const l = LABELS[options.language];
	const starts = [
		...new Set(day.sessions.map((s) => s.session.startAt.getTime())),
	].toSorted();
	if (day.layout === "list" || day.layout === "transposed") {
		return (
			<div className="space-y-[2mm]">
				{starts.map((t) => (
					<div key={t}>
						<div className="font-bold">{formatTime(new Date(t), tz)}</div>
						{day.sessions
							.filter((s) => s.session.startAt.getTime() === t)
							.map((s) => (
								<div
									className="pl-[2mm]"
									key={s.code}
									style={trackBar(s.session.track?.color, options.trackColor)}
								>
									<b>{s.code}</b> {s.session.title} ·{" "}
									{s.session.room?.name ?? "—"}
								</div>
							))}
					</div>
				))}
			</div>
		);
	}
	return (
		<table className="w-full table-fixed border-collapse text-[7pt]">
			<thead>
				<tr>
					<th className="w-[14mm] border border-black/40 p-[1mm] text-left">
						{l.time}
					</th>
					{day.rooms.map((r) => (
						<th className="border border-black/40 p-[1mm] text-left" key={r}>
							{r}
						</th>
					))}
				</tr>
			</thead>
			<tbody>
				{starts.map((t) => (
					<tr key={t}>
						<td className="border border-black/40 p-[1mm] align-top">
							{formatTime(new Date(t), tz)}
						</td>
						{day.rooms.map((r) => {
							const s = day.sessions.find(
								(x) =>
									x.session.startAt.getTime() === t &&
									(x.session.room?.name ?? "—") === r,
							);
							return (
								<td
									className={cn(
										"border border-black/40 p-[1mm] align-top",
										!s &&
											"bg-[repeating-linear-gradient(45deg,transparent_0_3px,var(--color-border)_3px_5px)]",
									)}
									key={r}
									style={
										s
											? trackBar(s.session.track?.color, options.trackColor)
											: undefined
									}
								>
									{s && (
										<>
											<b>{s.code}</b> {s.session.title}
										</>
									)}
								</td>
							);
						})}
					</tr>
				))}
			</tbody>
		</table>
	);
}

// fallow-ignore-next-line complexity -- throwaway prototype, never merged
function buildPages(p: PreviewProps): PageSpec[] {
	const l = LABELS[p.options.language];
	const pages: PageSpec[] = [
		{
			key: "title",
			label: "Title + contents",
			landscape: false,
			body: (
				<div className="space-y-[4mm]">
					<div className="h-[12mm] w-[40mm] bg-black/10 text-center text-[7pt] leading-[12mm]">
						logo
					</div>
					<div className="text-[20pt] font-bold">{p.conferenceName}</div>
					<div className="text-[12pt]">{p.dates}</div>
					<div className="pt-[6mm] text-[12pt] font-bold">{l.contents}</div>
					<div>{l.glance} ……… 2</div>
					{p.days.map((d) => (
						<div className="pl-[4mm]" key={d.index}>
							{d.label}
						</div>
					))}
					<div>
						{l.detailed} ……… {2 + p.days.length}
					</div>
					<div>
						{l.index} ……… {2 + p.days.length * 2}
					</div>
				</div>
			),
		},
	];
	for (const day of p.days) {
		const spec = (half?: string): PageSpec => ({
			key: `glance-${day.index}${half ?? ""}`,
			label: `${l.glance} · ${day.label}${half ? ` (${half})` : ""} · ${day.layout}`,
			landscape: day.landscape,
			body: (
				<div className="space-y-[3mm]">
					<div className="text-[13pt] font-bold">
						{l.glance} — {day.label}
					</div>
					<GlanceGrid day={day} options={p.options} tz={p.tz} />
				</div>
			),
		});
		if (day.layout === "spread") pages.push(spec("left"), spec("right"));
		else pages.push(spec());
	}
	for (const day of p.days) {
		pages.push({
			key: `detail-${day.index}`,
			label: `${l.detailed} · ${day.label}`,
			landscape: false,
			body: (
				<div className="space-y-[3mm]">
					<div className="text-[13pt] font-bold">{day.label}</div>
					{day.sessions.map(({ code, session }) => (
						<div
							className="pl-[2mm]"
							key={code}
							style={trackBar(session.track?.color, p.options.trackColor)}
						>
							<div className="font-bold">
								{code} {session.title}
							</div>
							<div className="text-[8pt]">
								{formatTime(session.startAt, p.tz)}–
								{formatTime(session.endAt, p.tz)} · {session.room?.name ?? "—"}
								{session.track ? ` · ${session.track.name}` : ""}
							</div>
							{session.chairs.length > 0 && (
								<div className="text-[8pt] italic">
									{l.chair}:{" "}
									{session.chairs
										.map((c) => `${c.firstName ?? ""} ${c.lastName ?? ""}`)
										.join(", ")}
								</div>
							)}
							{session.presentations
								.filter((x) => p.options.includeCancelled || !x.cancelled)
								.map((x) => (
									<div
										className={cn(
											"pl-[2mm] text-[8pt]",
											x.cancelled && "line-through",
										)}
										key={x.id}
									>
										{x.submissionTitle}
										<div className="text-black/70">
											{x.authors
												.map((a) => `${a.firstName.charAt(0)}. ${a.lastName}`)
												.join(", ")}
										</div>
									</div>
								))}
						</div>
					))}
				</div>
			),
		});
	}
	pages.push({
		key: "index",
		label: l.index,
		landscape: false,
		body: (
			<div className="columns-2 text-[8pt]">
				<div className="text-[13pt] font-bold">{l.index}</div>
				{buildAuthorIndex(p.days, p.options.language).map((e) => (
					<div key={e.name}>
						{e.name} — {e.codes.join(", ")}
					</div>
				))}
			</div>
		),
	});
	if (p.options.trackColor) {
		const tracks = new Map<string, string>();
		for (const d of p.days)
			for (const s of d.sessions)
				if (s.session.track?.color)
					tracks.set(s.session.track.name, s.session.track.color);
		if (tracks.size > 0 && pages[1]) {
			const first = pages[1];
			pages[1] = {
				...first,
				body: (
					<>
						<div className="mb-[2mm] flex flex-wrap gap-[3mm] text-[7pt]">
							{[...tracks].map(([name, color]) => (
								<span
									key={name}
									style={{
										borderLeft: `3pt solid ${color}`,
										paddingLeft: "1mm",
									}}
								>
									{name}
								</span>
							))}
						</div>
						{first.body}
					</>
				),
			};
		}
	}
	return pages;
}

function SheetPreview(p: PreviewProps) {
	const rows = p.days.flatMap((d) =>
		d.sessions.flatMap(({ code, session }) =>
			session.presentations
				.filter((x) => p.options.includeCancelled || !x.cancelled)
				.map((x) => [
					d.label,
					code,
					session.title,
					formatTime(session.startAt, p.tz),
					session.room?.name ?? "",
					x.submissionTitle,
					x.authors.map((a) => `${a.firstName} ${a.lastName}`).join(", "),
				]),
		),
	);
	const sheets = ["Program", ...p.days.map((d) => `D${d.index}`), "Authors"];
	return (
		<div className="bg-background overflow-auto rounded-md border text-xs">
			<table className="w-full border-collapse">
				<thead className="bg-muted">
					<tr>
						{[
							"Date",
							"Session code",
							"Session title",
							"Start",
							"Room",
							"Title",
							"Authors",
						].map((h) => (
							<th className="border px-2 py-1 text-left font-medium" key={h}>
								{h}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{rows.slice(0, 40).map((r) => (
						<tr key={r.join("|")}>
							{r.map((c, i) => (
								<td
									className="max-w-48 truncate border px-2 py-1"
									key={`${i}-${c}`}
								>
									{c}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
			<div className="bg-muted flex gap-1 border-t p-1">
				{sheets.map((s, i) => (
					<span
						className={cn(
							"rounded px-2 py-0.5",
							i === 0 && "bg-background font-medium shadow-sm",
						)}
						key={s}
					>
						{s}
					</span>
				))}
			</div>
		</div>
	);
}

export function PreviewPages(p: PreviewProps) {
	if (p.format === "xlsx") return <SheetPreview {...p} />;
	const pages = buildPages(p);
	return (
		<div
			className={cn(
				"flex gap-4",
				p.direction === "row" && "flex-row overflow-x-auto pb-2",
				(p.direction ?? "column") === "column" && "flex-col items-center",
				p.direction === "grid" && "flex-wrap",
			)}
		>
			{pages.map((spec, i) => (
				<Page
					draft={p.draft}
					footer={`${p.conferenceName} · ${i + 1}`}
					key={spec.key}
					options={p.options}
					spec={spec}
					width={spec.landscape ? p.pageWidth * 1.41 : p.pageWidth}
				/>
			))}
		</div>
	);
}

export function pageCount(p: PreviewProps): number {
	return p.format === "xlsx" ? 0 : buildPages(p).length;
}
