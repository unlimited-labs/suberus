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

/** Template row: neutral icon tile, name + description, placeholder chips. */
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
			data-testid="template-row"
			className="flex flex-col gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-foreground/20 hover:bg-accent/40 sm:flex-row sm:items-center sm:p-4"
		>
			<DocumentIconTile />
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium">{name}</p>
				{description && (
					<p className="truncate text-xs text-muted-foreground">
						{description}
					</p>
				)}
				<div className="mt-1.5">
					<PlaceholderChips placeholders={placeholders} />
				</div>
			</div>
			<span className="shrink-0 text-xs text-muted-foreground">
				{formatDate(createdAt)}
			</span>
			<div className="flex shrink-0 items-center gap-1">
				<Button
					asChild
					variant="ghost"
					size="icon-sm"
					aria-label="Download original"
				>
					<a href={downloadHref}>
						<IconDownload className="size-4" />
					</a>
				</Button>
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={onDelete}
					className="text-destructive hover:text-destructive"
					aria-label="Delete template"
				>
					<IconTrash className="size-4" />
				</Button>
			</div>
		</div>
	);
}
