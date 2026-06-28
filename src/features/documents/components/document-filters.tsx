import { IconSearch } from "@tabler/icons-react";
import { Input } from "@/shared/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";

export type StatusFilter = "ALL" | "PENDING" | "READY" | "FAILED";

interface DocumentFiltersProps {
	search: string;
	onSearchChange: (value: string) => void;
	status: StatusFilter;
	onStatusChange: (value: StatusFilter) => void;
	templateId: string;
	onTemplateChange: (value: string) => void;
	templates: { id: string; name: string }[];
}

/** Search + status + template filter row for the generated-documents table. */
export function DocumentFilters({
	search,
	onSearchChange,
	status,
	onStatusChange,
	templateId,
	onTemplateChange,
	templates,
}: DocumentFiltersProps) {
	return (
		<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
			<div className="relative flex-1">
				<IconSearch className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
				<Input
					value={search}
					onChange={(e) => onSearchChange(e.target.value)}
					placeholder="Search by participant…"
					className="pl-8"
					aria-label="Search documents by participant"
					data-testid="documents-search"
				/>
			</div>
			<Select
				value={status}
				onValueChange={(v) => onStatusChange(v as StatusFilter)}
			>
				<SelectTrigger className="w-full sm:w-40" aria-label="Filter by status">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="ALL">All statuses</SelectItem>
					<SelectItem value="READY">Ready</SelectItem>
					<SelectItem value="PENDING">Generating</SelectItem>
					<SelectItem value="FAILED">Failed</SelectItem>
				</SelectContent>
			</Select>
			<Select value={templateId} onValueChange={onTemplateChange}>
				<SelectTrigger
					className="w-full sm:w-48"
					aria-label="Filter by template"
				>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="ALL">All templates</SelectItem>
					{templates.map((t) => (
						<SelectItem key={t.id} value={t.id}>
							{t.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
