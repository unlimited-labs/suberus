import { IconZoomIn, IconZoomOut } from "@tabler/icons-react";
import {
	startTransition,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import {
	type MeasuredBlock,
	type Page,
	paginate,
} from "@/features/planner/print/paginate-rules";
import {
	rowBreaks,
	contentSizeMm,
	MARGIN_MM,
	pageSizeMm,
	PX_PER_MM,
} from "@/features/planner/print/print-document-rules";
import {
	type PrintBlock,
	type PrintDocument,
	type PrintSection,
	TOC_LEVELS,
} from "@/features/planner/print/print-document-schema";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Block, type TocEntry } from "./document-blocks";

const PAGE_FONT = {
	fontFamily: "Arial, 'Liberation Sans', Helvetica, sans-serif",
};

function measureSection(
	el: Element,
	blocks: PrintSection["blocks"],
): MeasuredBlock[] {
	const nodes = el.querySelectorAll<HTMLElement>(":scope > [data-block]");
	return [...nodes].map((node, i) => {
		const block = blocks[i];
		if (block?.type !== "table") return { height: node.offsetHeight };
		const rows = [
			...node.querySelectorAll<HTMLTableRowElement>("tr[data-row]"),
		];
		return {
			headerRows: block.headerRows,
			rows: rows.map((tr) => tr.offsetHeight),
			breakable: rowBreaks(block.cells, block.rowCount),
		};
	});
}

const isTocLevel = (style: string): style is keyof typeof TOC_LEVELS =>
	style in TOC_LEVELS;

function tocEntry(block: PrintBlock | undefined, page: number): TocEntry[] {
	if (block?.type !== "paragraph" || !isTocLevel(block.style)) return [];
	const text = block.runs.map((r) => r.text).join("");
	return [{ level: TOC_LEVELS[block.style], text, page }];
}

function tocEntries(doc: PrintDocument, pages: Page[]): TocEntry[] {
	return pages.flatMap((page, i) =>
		page.items.flatMap((item) =>
			item.rows
				? []
				: tocEntry(doc.sections[page.section]?.blocks[item.block], i + 1),
		),
	);
}

// Measured with three-digit page numbers so the real contents takes no more room than measured.
const draftToc = (doc: PrintDocument) =>
	doc.sections.flatMap((s) => s.blocks.flatMap((b) => tocEntry(b, 888)));

interface Measured {
	doc: PrintDocument;
	pages: Page[];
}

function MeasureLayer({
	doc,
	onMeasured,
}: {
	doc: PrintDocument;
	onMeasured: (measured: Measured) => void;
}) {
	const root = useRef<HTMLDivElement>(null);
	const ruler = useRef<HTMLDivElement>(null);
	const toc = draftToc(doc);
	useLayoutEffect(() => {
		const el = root.current;
		const mm = (ruler.current?.offsetHeight ?? 1000) / 1000;
		if (!el) return;
		const nodes = el.querySelectorAll(":scope > [data-section]");
		const sections = doc.sections.map((section, i) => {
			const node = nodes.item(i);
			return {
				start: section.start,
				columns: section.columns,
				blocks: node ? measureSection(node, section.blocks) : [],
				pageHeight: contentSizeMm(section.page)[1] * mm,
			};
		});
		const pages = paginate(sections);
		startTransition(() => onMeasured({ doc, pages }));
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
					const [w] = contentSizeMm(section.page);
					return (
						<div
							className={cn(section.columns === 2 && "columns-2 gap-[6mm]")}
							data-section={si}
							key={`${si}-${section.blocks.length}`}
							style={{ width: `${w}mm` }}
						>
							{section.blocks.map((block, bi) => (
								<div
									className="flow-root"
									data-block={bi}
									key={`${bi}-${block.type}`}
								>
									<Block block={block} toc={toc} />
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
			className="mx-auto shrink-0 [content-visibility:auto]"
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
					<div
						className="absolute bottom-[8mm] flex justify-between text-[7pt] opacity-60"
						style={{ left: `${MARGIN_MM}mm`, right: `${MARGIN_MM}mm` }}
					>
						<span>{doc.footer}</span>
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

const ZOOMS: readonly number[] = [1, 1.5, 2];

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

function PreviewBar({
	current,
	count,
	approximate,
	zoom,
	onZoom,
}: {
	current: number;
	count: number;
	approximate: boolean;
	zoom: number;
	onZoom: (zoom: number) => void;
}) {
	const at = ZOOMS.indexOf(zoom);
	return (
		<div className="text-muted-foreground bg-muted/80 sticky top-0 z-10 mb-3 flex items-center justify-between gap-2 rounded-md px-2 py-1 text-xs backdrop-blur">
			<span data-testid="print-page-counter">
				{count === 0
					? "Laying out pages…"
					: `${approximate ? "About page" : "Page"} ${Math.min(current, count)} / ${count}`}
				{approximate && count > 0 && " · InDesign reflows the text"}
			</span>
			<span className="flex items-center gap-1">
				<Button
					aria-label="Zoom out"
					disabled={at <= 0}
					onClick={() => onZoom(ZOOMS[at - 1] ?? 1)}
					size="icon-xs"
					variant="ghost"
				>
					<IconZoomOut />
				</Button>
				<span className="w-9 text-center tabular-nums">
					{zoom === 1 ? "Fit" : `${zoom * 100}%`}
				</span>
				<Button
					aria-label="Zoom in"
					disabled={at >= ZOOMS.length - 1}
					onClick={() => onZoom(ZOOMS[at + 1] ?? zoom)}
					size="icon-xs"
					variant="ghost"
				>
					<IconZoomIn />
				</Button>
			</span>
		</div>
	);
}

function MeasuredPages({
	measured: { doc, pages },
	pageWidth,
}: {
	measured: Measured;
	pageWidth: number;
}) {
	const toc = tocEntries(doc, pages);
	return pages.map((page, i) =>
		page.blank ? (
			<div
				className="text-muted-foreground shrink-0 text-center text-xs"
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
	);
}

export function PrintPreview({
	doc,
	approximate,
}: {
	doc: PrintDocument;
	approximate: boolean;
}) {
	const [measured, setMeasured] = useState<Measured | null>(null);
	const [zoom, setZoom] = useState(1);
	const scroller = useRef<HTMLDivElement>(null);
	const pages = measured?.pages ?? [];
	const current = usePageCounter(scroller, pages.length);
	const available = useWidth(scroller);
	const pageWidth = Math.min(available - 16, 620) * zoom;
	return (
		<div className="relative">
			{measured?.doc !== doc && (
				<MeasureLayer doc={doc} onMeasured={setMeasured} />
			)}
			<PreviewBar
				approximate={approximate}
				count={pages.length}
				current={current}
				onZoom={setZoom}
				zoom={zoom}
			/>
			<div
				className="flex max-h-[calc(100vh-12rem)] flex-col gap-4 overflow-auto pb-8"
				ref={scroller}
			>
				{measured && (
					<MeasuredPages measured={measured} pageWidth={pageWidth} />
				)}
			</div>
			<div className="from-muted/80 pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-linear-to-t to-transparent" />
		</div>
	);
}
