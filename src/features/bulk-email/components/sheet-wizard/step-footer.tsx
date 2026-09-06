import { Button } from "@/shared/ui/button";
import type { WizardState } from "./use-sheet-wizard";

interface StepFooterProps {
	state: WizardState;
	busy: boolean;
	canCreate: boolean;
	onBack: () => void;
	onNext: () => void;
	onCreate: () => void;
}

export function StepFooter({
	state,
	busy,
	canCreate,
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
					{state.result.problems.length === 0 && (
						<Button
							data-testid="sheet-map-btn"
							disabled={busy}
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
						Create campaign
					</Button>
				</>
			);
		default: {
			const _exhaustive: never = state;
			throw new Error(`Unsupported wizard step: ${_exhaustive}`);
		}
	}
}
