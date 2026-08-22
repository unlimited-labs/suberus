import { IconDownload, IconTrash } from "@tabler/icons-react";
import {
	DocumentIconTile,
	PlaceholderChips,
} from "@/features/documents/components/document-bits";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { Button } from "@/shared/ui/button";

interface TemplateCardProps {
	name: string;
	description: string | null;
	placeholders: string[];
	createdAt: Date;
	downloadHref: string;
	onDelete: () => void;
}

export function TemplateCard({
	name,
	description,
	placeholders,
	createdAt,
	downloadHref,
	onDelete,
}: TemplateCardProps) {
	const { formatDate } = useDateFormat();

	return (
		<div
			className="bg-card hover:border-foreground/20 hover:bg-accent/40 flex flex-col gap-3 rounded-xl border p-3 transition-colors sm:flex-row sm:items-center sm:p-4"
			data-testid="template-row"
		>
			<DocumentIconTile />
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium">{name}</p>
				{description && (
					<p className="text-muted-foreground truncate text-xs">
						{description}
					</p>
				)}
				<div className="mt-1.5">
					<PlaceholderChips placeholders={placeholders} />
				</div>
			</div>
			<span className="text-muted-foreground shrink-0 text-xs">
				{formatDate(createdAt)}
			</span>
			<div className="flex shrink-0 items-center gap-1">
				<Button asChild size="icon-sm" variant="ghost">
					<a aria-label="Download original" href={downloadHref}>
						<IconDownload className="size-4" />
					</a>
				</Button>
				<Button
					aria-label="Delete template"
					className="text-destructive hover:text-destructive"
					onClick={onDelete}
					size="icon-sm"
					variant="ghost"
				>
					<IconTrash className="size-4" />
				</Button>
			</div>
		</div>
	);
}
