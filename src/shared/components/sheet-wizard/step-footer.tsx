import { Button } from "@/shared/ui/button";
import type { WizardState } from "./use-sheet-wizard";

interface StepFooterProps {
	state: WizardState;
	busy: boolean;
	canCreate: boolean;
	recipientCount: number;
	blocked: boolean;
	createLabel: string;
	onBack: () => void;
	onNext: () => void;
	onCreate: () => void;
}

export function StepFooter({
	state,
	busy,
	canCreate,
	recipientCount,
	blocked,
	createLabel,
	onBack,
	onNext,
	onCreate,
}: StepFooterProps) {
	switch (state.step) {
		case "upload":
			return (
				<Button
					data-testid="sheet-check-btn"
					disabled={busy || !state.picked}
					onClick={onNext}
				>
					Check recipients
				</Button>
			);
		case "match":
			return (
				<>
					<Button disabled={busy} onClick={onBack} variant="outline">
						Back
					</Button>
					{!blocked && (
						<Button
							data-testid="sheet-map-btn"
							disabled={busy || recipientCount === 0}
							onClick={onNext}
						>
							Map columns
						</Button>
					)}
				</>
			);
		case "mapping":
			return (
				<>
					<Button disabled={busy} onClick={onBack} variant="outline">
						Back
					</Button>
					<Button
						data-testid="sheet-create-btn"
						disabled={busy || !canCreate}
						onClick={onCreate}
					>
						{createLabel}
					</Button>
				</>
			);
		default: {
			const _exhaustive: never = state;
			throw new Error(`Unsupported wizard step: ${_exhaustive}`);
		}
	}
}
