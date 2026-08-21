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
			onOpenChange={(o) => {
				if (b.busy) return;
				if (!o) b.reset();
				onOpenChange(o);
			}}
			open={open}
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
						onSelect={b.setTemplateId}
						templateId={b.templateId}
						templates={b.templates}
					/>
				)}
				{b.step === "review" && b.preview && <ReviewStep preview={b.preview} />}
				{b.step === "progress" && b.progress && (
					<ProgressStep pct={b.pct} progress={b.progress} />
				)}

				<DialogFooter>
					<StepFooter
						busy={b.busy}
						onBack={() => b.setStep("template")}
						onClose={() => onOpenChange(false)}
						onReview={b.review}
						onStart={b.start}
						preview={b.preview}
						step={b.step}
						templateId={b.templateId}
					/>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
