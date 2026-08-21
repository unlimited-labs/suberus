import { IconFiles } from "@tabler/icons-react";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";

export function DocumentsEmptyState({
	hasFilters,
	onClear,
}: {
	hasFilters: boolean;
	onClear: () => void;
}) {
	if (!hasFilters) {
		return (
			<EmptyState
				description="Documents generated for participants will appear here."
				icon={IconFiles}
				title="No documents yet"
			/>
		);
	}
	return (
		<EmptyState
			action={
				<Button onClick={onClear} size="sm" variant="outline">
					Clear filters
				</Button>
			}
			description="No documents match the current filters. Try clearing them."
			icon={IconFiles}
			title="No matching documents"
		/>
	);
}
