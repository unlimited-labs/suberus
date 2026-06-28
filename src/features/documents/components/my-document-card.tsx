import { IconDownload, IconRosetteDiscountCheck } from "@tabler/icons-react";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { Button } from "@/shared/ui/button";

interface MyDocumentCardProps {
	name: string;
	createdAt: Date;
	downloadHref: string;
}

/**
 * Participant-facing certificate card: a decorative "paper + seal" header
 * (purely CSS — no PDF thumbnail), the document name, meta and a full-width
 * download action. Used only by the participant `/documents` gallery.
 */
export function MyDocumentCard({
	name,
	createdAt,
	downloadHref,
}: MyDocumentCardProps) {
	const { formatDateTime } = useDateFormat();

	return (
		<div
			data-testid="my-document-row"
			className="group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card transition hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md"
		>
			<div className="relative flex h-28 items-center justify-center bg-gradient-to-br from-emerald-50 to-emerald-100/40 dark:from-emerald-500/10 dark:to-emerald-500/5">
				<div className="flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-4 ring-emerald-50 dark:bg-emerald-500/20 dark:text-emerald-300 dark:ring-emerald-500/10">
					<IconRosetteDiscountCheck className="size-7" />
				</div>
			</div>
			<div className="flex flex-1 flex-col gap-3 p-4">
				<div className="min-w-0 flex-1">
					<p className="line-clamp-2 text-sm font-medium" title={name}>
						{name}
					</p>
					<p className="mt-1 text-xs text-muted-foreground">
						{formatDateTime(createdAt)}
					</p>
				</div>
				<Button
					asChild
					variant="outline"
					size="sm"
					className="w-full"
					data-testid="download-my-document"
				>
					<a href={downloadHref}>
						<IconDownload className="mr-2 size-4" />
						Download
					</a>
				</Button>
			</div>
		</div>
	);
}
