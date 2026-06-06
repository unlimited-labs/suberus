import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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
		<Dialog open={open} onOpenChange={onOpenChange}>
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
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button variant="destructive" onClick={onConfirm} disabled={isBusy}>
						{isBusy ? "Deleting..." : "Delete"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
