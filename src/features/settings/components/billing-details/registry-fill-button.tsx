import type { BillingColumnValues } from "@/features/settings/billing-details-rules";
import { Button } from "@/shared/ui/button";

export function RegistryFillButton({
	fill,
	onApply,
}: {
	fill: BillingColumnValues;
	onApply: (fill: BillingColumnValues) => void;
}) {
	if (Object.keys(fill).length === 0) return null;
	return (
		<Button
			data-testid="registry-fill"
			onClick={() => onApply(fill)}
			size="sm"
			type="button"
			variant="outline"
		>
			Use these details
		</Button>
	);
}
