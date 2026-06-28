import type { BulkPreview } from "@/features/documents/server/bulk";
import { Button } from "@/shared/ui/button";
import type { Step } from "./use-bulk-generate";

interface StepFooterProps {
	step: Step;
	busy: boolean;
	templateId: string | null;
	preview: BulkPreview | null;
	onReview: () => void;
	onBack: () => void;
	onStart: () => void;
	onClose: () => void;
}

export function StepFooter({
	step,
	busy,
	templateId,
	preview,
	onReview,
	onBack,
	onStart,
	onClose,
}: StepFooterProps) {
	if (step === "template") {
		return (
			<Button
				onClick={onReview}
				disabled={busy || !templateId}
				data-testid="bulk-review-button"
			>
				Review
			</Button>
		);
	}
	if (step === "review") {
		return (
			<>
				<Button variant="outline" onClick={onBack} disabled={busy}>
					Back
				</Button>
				<Button
					onClick={onStart}
					disabled={busy || !preview || preview.resolvableIds.length === 0}
					data-testid="bulk-generate-button"
				>
					Generate {preview?.resolvableIds.length ?? 0}
				</Button>
			</>
		);
	}
	return <Button onClick={onClose}>Close</Button>;
}
