import { Button } from "@/shared/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";
import type { SurveyQuestion } from "./survey-question-fields";

interface SurveyQuestionDeleteDialogProps {
	question: SurveyQuestion | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
	isBusy: boolean;
}

export function SurveyQuestionDeleteDialog({
	question,
	open,
	onOpenChange,
	onConfirm,
	isBusy,
}: SurveyQuestionDeleteDialogProps) {
	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Delete question</DialogTitle>
					<DialogDescription>
						{question
							? `Delete "${question.label}"? This also permanently removes every answer users have given to it. This cannot be undone.`
							: null}
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button onClick={() => onOpenChange(false)} variant="outline">
						Cancel
					</Button>
					<Button disabled={isBusy} onClick={onConfirm} variant="destructive">
						{isBusy ? "Deleting..." : "Delete"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
