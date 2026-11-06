import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
	type MeasuredBlock,
	type Page,
	paginate,
} from "@/features/planner/print/paginate-rules";
import {
	FOOTER_MM,
	MARGIN_MM,
	pageSizeMm,
	PX_PER_MM,
} from "@/features/planner/print/print-document-rules";
import type { PrintDocument } from "@/features/planner/print/print-document-schema";
import { cn } from "@/shared/lib/utils";
import { Block, type TocEntry } from "./document-blocks";

const PAGE_FONT = {
	fontFamily: "Arial, 'Liberation Sans', Helvetica, sans-serif",
};

function measureSection(el: HTMLElement): MeasuredBlock[] {
	return [...el.querySelectorAll<HTMLElement>(":scope > [data-block]")].map(
		(node) => {
			const rows = [
				...node.querySelectorAll<HTMLTableRowElement>("tr[data-row]"),
			];
			if (rows.length === 0) return { height: node.offsetHeight };
			const spans = new Set<number>();
			rows.forEach((tr, r) => {
				for (const td of tr.cells)
					for (let k = 1; k < td.rowSpan; k++) spans.add(r + k);
			});
			return {
				height: 0,
				headerRows: Number(node.dataset.headerRows ?? 0),
				rows: rows.map((tr) => tr.offsetHeight),
				breakable: rows.map((_, r) => !spans.has(r + 1)),
			};
		},
	);
}

function tocEntries(doc: PrintDocument, pages: Page[]): TocEntry[] {
	return pages.flatMap((page, i) =>
		page.items.flatMap((item): TocEntry[] => {
			const block = doc.sections[page.section]?.blocks[item.block];
			if (block?.type !== "paragraph" || item.rows) return [];
			if (block.style !== "PartHeading" && block.style !== "DayHeading")
				return [];
			return [
				{
					level: block.style === "PartHeading" ? 1 : 2,
					text: block.runs.map((r) => r.text).join(""),
					page: i + 1,
				},
			];
		}),
	);
}

function MeasureLayer({
	doc,
	onMeasured,
}: {
	doc: PrintDocument;
	onMeasured: (pages: Page[]) => void;
}) {
	const root = useRef<HTMLDivElement>(null);
	const ruler = useRef<HTMLDivElement>(null);
	useLayoutEffect(() => {
		const el = root.current;
		const mm = (ruler.current?.offsetHeight ?? 1000) / 1000;
		if (!el) return;
		const sections = [
			...el.querySelectorAll<HTMLElement>(":scope > [data-section]"),
		].map((node, i) => {
			const section = doc.sections[i];
			const [, h] = section ? pageSizeMm(section.page) : [0, 297];
			return {
				start: section?.start ?? "nextPage",
				columns: section?.columns ?? 1,
				blocks: measureSection(node),
				pageHeight: (h - 2 * MARGIN_MM - FOOTER_MM) * mm,
			};
		});
		onMeasured(paginate(sections));
	}, [doc, onMeasured]);
	return (
		<div
			aria-hidden
			className="pointer-events-none invisible absolute top-0 left-0 -z-10"
			style={PAGE_FONT}
		>
			<div ref={ruler} style={{ height: "1000mm" }} />
			<div ref={root}>
				{doc.sections.map((section, si) => {
					const [w] = pageSizeMm(section.page);
					return (
						<div
							className={cn(section.columns === 2 && "columns-2 gap-[6mm]")}
							data-section={si}
							key={`${si}-${section.blocks.length}`}
							style={{ width: `${w - 2 * MARGIN_MM}mm` }}
						>
							{section.blocks.map((block, bi) => (
								<div
									data-block={bi}
									data-header-rows={
										block.type === "table" ? block.headerRows : undefined
									}
									key={`${bi}-${block.type}`}
								>
									<Block block={block} toc={[]} />
								</div>
							))}
						</div>
					);
				})}
			</div>
		</div>
	);
}

interface SheetProps {
	doc: PrintDocument;
	page: Page;
	number: number;
	toc: TocEntry[];
	width: number;
}

function Sheet({ doc, page, number, toc, width }: SheetProps) {
	const section = doc.sections[page.section];
	if (!section) return null;
	const [w, h] = pageSizeMm(section.page);
	const scale = width / (w * PX_PER_MM);
	return (
		<figure
			className="shrink-0 [content-visibility:auto]"
			data-page={number}
			data-testid="print-preview-page"
			style={{
				containIntrinsicSize: `auto ${Math.round(h * PX_PER_MM * scale)}px`,
			}}
		>
			<div
				className="relative overflow-hidden bg-white text-black shadow-md ring-1 ring-black/10"
				style={{ width, height: h * PX_PER_MM * scale }}
			>
				<div
					className="absolute top-0 left-0 origin-top-left"
					style={{
						...PAGE_FONT,
						width: `${w}mm`,
						height: `${h}mm`,
						padding: `${MARGIN_MM}mm`,
						transform: `scale(${scale})`,
					}}
				>
					{doc.draft && (
						<div className="pointer-events-none absolute inset-0 flex [transform:rotate(-35deg)] items-center justify-center text-[90pt] font-bold text-black/10">
							DRAFT
						</div>
					)}
					<div
						className={cn(
							"relative",
							section.columns === 2 && "columns-2 gap-[6mm]",
						)}
					>
						{page.items.map((item) => {
							const block = section.blocks[item.block];
							return block ? (
								<Block
									block={block}
									key={`${item.block}-${item.rows?.join()}`}
									rows={item.rows}
									toc={toc}
								/>
							) : null;
						})}
					</div>
					<div className="absolute inset-x-[15mm] bottom-[8mm] flex justify-between text-[7pt] opacity-60">
						<span>{section.footer}</span>
						<span>{number}</span>
					</div>
				</div>
			</div>
		</figure>
	);
}

function usePageCounter(
	container: React.RefObject<HTMLDivElement | null>,
	count: number,
) {
	const [current, setCurrent] = useState(1);
	useEffect(() => {
		const root = container.current;
		if (!root) return;
		const observer = new IntersectionObserver(
			(entries) => {
				const top = entries.flatMap((e) =>
					e.isIntersecting && e.target instanceof HTMLElement
						? [Number(e.target.dataset.page)]
						: [],
				);
				if (top.length > 0) setCurrent(Math.min(...top));
			},
			{ root, threshold: 0.5 },
		);
		for (const el of root.querySelectorAll("[data-page]")) observer.observe(el);
		return () => observer.disconnect();
	}, [container, count]);
	return current;
}

const THUMBNAIL_BELOW_PX = 520;

function useWidth(ref: React.RefObject<HTMLDivElement | null>) {
	const [width, setWidth] = useState(0);
	useLayoutEffect(() => {
		const el = ref.current;
		if (!el) return;
		const observer = new ResizeObserver(([entry]) =>
			setWidth(entry?.contentRect.width ?? 0),
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [ref]);
	return width;
}

export function PrintPreview({ doc }: { doc: PrintDocument }) {
	const [pages, setPages] = useState<Page[]>([]);
	const scroller = useRef<HTMLDivElement>(null);
	const current = usePageCounter(scroller, pages.length);
	const available = useWidth(scroller);
	const thumbnails = available > 0 && available < THUMBNAIL_BELOW_PX;
	const pageWidth = thumbnails
		? (available - 16) / 2
		: Math.min(available - 16, 620);
	const toc = tocEntries(doc, pages);
	return (
		<div className="relative">
			<MeasureLayer doc={doc} onMeasured={setPages} />
			<div
				className="text-muted-foreground bg-muted/80 sticky top-0 z-10 mb-3 rounded-md px-2 py-1 text-xs backdrop-blur"
				data-testid="print-page-counter"
			>
				Page {Math.min(current, pages.length)} / {pages.length}
			</div>
			<div
				className={cn(
					"max-h-[calc(100vh-12rem)] overflow-y-auto pb-8",
					thumbnails
						? "grid grid-cols-2 gap-4"
						: "flex flex-col items-center gap-4",
				)}
				ref={scroller}
			>
				{pages.map((page, i) =>
					page.blank ? (
						<div
							className="text-muted-foreground shrink-0 text-xs"
							data-page={i + 1}
							key={`blank-${i}`}
						>
							Blank page {i + 1}
						</div>
					) : (
						<Sheet
							doc={doc}
							key={`${page.section}-${i}`}
							number={i + 1}
							page={page}
							toc={toc}
							width={pageWidth}
						/>
					),
				)}
			</div>
			<div className="from-muted/80 pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-linear-to-t to-transparent" />
		</div>
	);
}
