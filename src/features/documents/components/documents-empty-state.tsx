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
				icon={IconFiles}
				title="No documents yet"
				description="Documents generated for participants will appear here."
			/>
		);
	}
	return (
		<EmptyState
			icon={IconFiles}
			title="No matching documents"
			description="No documents match the current filters. Try clearing them."
			action={
				<Button variant="outline" size="sm" onClick={onClear}>
					Clear filters
				</Button>
			}
		/>
	);
}
