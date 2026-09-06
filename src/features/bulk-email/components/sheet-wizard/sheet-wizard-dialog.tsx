import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";
import { MappingStep } from "./mapping-step";
import { MatchStep } from "./match-step";
import { StepFooter } from "./step-footer";
import { UploadStep } from "./upload-step";
import { useSheetWizard } from "./use-sheet-wizard";

const TITLES = {
	upload: "Upload spreadsheet",
	match: "Check recipients",
	mapping: "Map columns",
} as const;

const DESCRIPTIONS = {
	upload: "An .xlsx or .xls file with one recipient per row.",
	match: "Who the addresses in the file belong to.",
	mapping: "Which columns become placeholders in the message.",
} as const;

interface SheetWizardDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function SheetWizardDialog({
	open,
	onOpenChange,
}: SheetWizardDialogProps) {
	const wizard = useSheetWizard(() => onOpenChange(false));
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
				<DialogHeader>
					<DialogTitle>{TITLES[state.step]}</DialogTitle>
					<DialogDescription>{DESCRIPTIONS[state.step]}</DialogDescription>
					<p className="text-muted-foreground text-xs font-medium">
						Step {wizard.stepIndex} of 3
					</p>
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
						recipientCount={wizard.recipientCount}
						result={state.result}
						sheet={state.sheet}
						unmatched={state.unmatched}
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
						busy={wizard.busy}
						canCreate={wizard.canCreate}
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
