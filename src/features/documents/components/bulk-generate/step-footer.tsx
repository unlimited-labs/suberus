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
				data-testid="bulk-review-button"
				disabled={busy || !templateId}
				onClick={onReview}
			>
				Review
			</Button>
		);
	}
	if (step === "review") {
		return (
			<>
				<Button disabled={busy} onClick={onBack} variant="outline">
					Back
				</Button>
				<Button
					data-testid="bulk-generate-button"
					disabled={busy || !preview || preview.resolvableIds.length === 0}
					onClick={onStart}
				>
					Generate {preview?.resolvableIds.length ?? 0}
				</Button>
			</>
		);
	}
	return <Button onClick={onClose}>Close</Button>;
}
