import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";
import { ProgressStep } from "./bulk-generate/progress-step";
import { ReviewStep } from "./bulk-generate/review-step";
import { StepFooter } from "./bulk-generate/step-footer";
import { TemplateStep } from "./bulk-generate/template-step";
import { useBulkGenerate } from "./bulk-generate/use-bulk-generate";

interface BulkGenerateDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Participants selected in the Users list. */
	userIds: string[];
	onDone?: () => void;
}

const DESCRIPTIONS = {
	review: "Review who can be generated.",
	progress: "Generating documents…",
} as const;

export function BulkGenerateDialog({
	open,
	onOpenChange,
	userIds,
	onDone,
}: BulkGenerateDialogProps) {
	const b = useBulkGenerate(userIds, onDone);

	return (
		<Dialog
			open={open}
			onOpenChange={(o) => {
				if (b.busy) return;
				if (!o) b.reset();
				onOpenChange(o);
			}}
		>
			<DialogContent className="sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>Generate documents</DialogTitle>
					<DialogDescription>
						{b.step === "template"
							? `Choose a template for the ${userIds.length} selected participant${userIds.length === 1 ? "" : "s"}.`
							: DESCRIPTIONS[b.step]}
					</DialogDescription>
					<p className="text-xs font-medium text-muted-foreground">
						Step {b.stepIndex} of 3
					</p>
				</DialogHeader>

				{b.step === "template" && (
					<TemplateStep
						templates={b.templates}
						templateId={b.templateId}
						onSelect={b.setTemplateId}
					/>
				)}
				{b.step === "review" && b.preview && <ReviewStep preview={b.preview} />}
				{b.step === "progress" && b.progress && (
					<ProgressStep progress={b.progress} pct={b.pct} />
				)}

				<DialogFooter>
					<StepFooter
						step={b.step}
						busy={b.busy}
						templateId={b.templateId}
						preview={b.preview}
						onReview={b.review}
						onBack={() => b.setStep("template")}
						onStart={b.start}
						onClose={() => onOpenChange(false)}
					/>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
