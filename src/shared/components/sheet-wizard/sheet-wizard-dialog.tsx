import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";
import { StepIndicator } from "@/shared/ui/step-indicator";
import { MappingStep } from "./mapping-step";
import { MatchStep } from "./match-step";
import { StepFooter } from "./step-footer";
import { UploadStep } from "./upload-step";
import { type SheetWizardOptions, useSheetWizard } from "./use-sheet-wizard";

const STEPS = [
	{ id: 1, title: "Upload spreadsheet" },
	{ id: 2, title: "Check recipients" },
	{ id: 3, title: "Map columns" },
] as const;

const DESCRIPTIONS = {
	upload: "An .xlsx or .xls file with one recipient per row.",
	match: "Who the addresses in the file belong to.",
	mapping: "Which columns become placeholders in the message.",
} as const;

interface SheetWizardDialogProps<Payload> extends SheetWizardOptions<Payload> {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function SheetWizardDialog<Payload>({
	open,
	onOpenChange,
	...options
}: SheetWizardDialogProps<Payload>) {
	const wizard = useSheetWizard(options);
	const { state } = wizard;

	return (
		<Dialog
			onOpenChange={(next) => {
				if (wizard.busy) return;
				if (!next) wizard.reset();
				onOpenChange(next);
			}}
			open={open}
		>
			<DialogContent className="sm:max-w-3xl">
				<DialogHeader className="gap-3">
					<DialogTitle>Import spreadsheet</DialogTitle>
					<StepIndicator
						currentStep={wizard.stepIndex}
						orientation="horizontal"
						steps={STEPS}
					/>
					<DialogDescription>{DESCRIPTIONS[state.step]}</DialogDescription>
				</DialogHeader>

				{state.step === "upload" && (
					<UploadStep
						onEmailColumn={wizard.setEmailColumn}
						onPick={wizard.pickFile}
						picked={state.picked}
					/>
				)}
				{state.step === "match" && (
					<MatchStep
						onUnmatched={wizard.setUnmatched}
						problems={wizard.problems}
						recipientCount={wizard.recipientCount}
						result={state.result}
						sheet={state.sheet}
						unmatched={state.unmatched}
						unmatchedMode={wizard.unmatchedMode}
					/>
				)}
				{state.step === "mapping" && (
					<MappingStep
						allowNames={
							state.unmatched === "add" &&
							state.result.rows.some((r) => r.kind === "unknown")
						}
						error={wizard.mappingError}
						mapping={state.mapping}
						onTarget={wizard.setTarget}
						sheet={state.sheet}
					/>
				)}

				<DialogFooter>
					<StepFooter
						blocked={wizard.problems.length > 0 || wizard.unresolvedUnmatched}
						busy={wizard.busy}
						canCreate={wizard.canCreate}
						createLabel={wizard.createLabel}
						onBack={wizard.back}
						onCreate={wizard.create}
						onNext={state.step === "upload" ? wizard.toMatch : wizard.toMapping}
						recipientCount={wizard.recipientCount}
						state={state}
					/>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
