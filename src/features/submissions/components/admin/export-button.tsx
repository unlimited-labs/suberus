import { IconDownload } from "@tabler/icons-react";
import type { AdminSubmission } from "@/features/submissions/server/admin-submissions";
import { Button } from "@/shared/ui/button";
import type { AppTable } from "@/shared/ui/data-table/table-features";

interface SubmissionExportButtonProps {
	table: AppTable<AdminSubmission>;
}

export function SubmissionExportButton({ table }: SubmissionExportButtonProps) {
	const filters = table.state.columnFilters;
	const params = new URLSearchParams();

	for (const filter of filters) {
		if (filter.id === "title" && typeof filter.value === "string") {
			params.set("search", filter.value);
		}
		if (
			filter.id === "type" &&
			Array.isArray(filter.value) &&
			filter.value.length > 0
		) {
			params.set("type", filter.value.join(","));
		}
		if (
			filter.id === "status" &&
			Array.isArray(filter.value) &&
			filter.value.length > 0
		) {
			params.set("status", filter.value.join(","));
		}
	}

	const query = params.toString();
	const href = `/api/admin/submissions/export${query ? `?${query}` : ""}`;

	return (
		<Button variant="outline" size="sm" asChild>
			<a href={href} target="_blank" rel="noreferrer">
				<IconDownload className="mr-2 size-4" />
				Export ZIP
			</a>
		</Button>
	);
}
