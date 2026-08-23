import {
	IconDownload,
	IconRosetteDiscountCheck,
	IconShieldCheck,
} from "@tabler/icons-react";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { Button } from "@/shared/ui/button";

interface MyDocumentCardProps {
	name: string;
	createdAt: Date;
	downloadHref: string;
	signed?: boolean;
}

export function MyDocumentCard({
	name,
	createdAt,
	downloadHref,
	signed = false,
}: MyDocumentCardProps) {
	const { formatDateTime } = useDateFormat();

	return (
		<div
			className="group border-border/70 bg-card hover:border-foreground/20 flex flex-col overflow-hidden rounded-2xl border transition hover:-translate-y-0.5 hover:shadow-md"
			data-testid="my-document-row"
		>
			<div className="relative flex h-28 items-center justify-center bg-linear-to-br from-emerald-50 to-emerald-100/40 dark:from-emerald-500/10 dark:to-emerald-500/5">
				<div className="flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-4 ring-emerald-50 dark:bg-emerald-500/20 dark:text-emerald-300 dark:ring-emerald-500/10">
					<IconRosetteDiscountCheck className="size-7" />
				</div>
				{signed && (
					<span
						className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-emerald-600/90 px-2 py-0.5 text-xs font-medium text-white"
						data-testid="document-signed-badge"
						title="Digitally signed"
					>
						<IconShieldCheck className="size-3.5" />
						Signed
					</span>
				)}
			</div>
			<div className="flex flex-1 flex-col gap-3 p-4">
				<div className="min-w-0 flex-1">
					<p className="line-clamp-2 text-sm font-medium" title={name}>
						{name}
					</p>
					<p className="text-muted-foreground mt-1 text-xs">
						{formatDateTime(createdAt)}
					</p>
				</div>
				<Button
					asChild
					className="w-full"
					data-testid="download-my-document"
					size="sm"
					variant="outline"
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
