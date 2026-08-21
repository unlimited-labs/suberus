import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { saveAdminUserSurveyAnswersFn } from "@/features/survey/api/survey";
import { SurveyAnswersForm } from "@/features/survey/components/survey-answers-form";
import { adminUserDetailQueryOptions } from "@/features/users/api/users";
import type { SurveyQuestionType } from "@/generated/prisma/enums";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";

interface SurveyQuestion {
	id: string;
	label: string;
	type: SurveyQuestionType;
	options: string[] | null;
	allowOther: boolean;
	isRequired: boolean;
}

interface UserSurveyDialogProps {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	userId: string;
	userName: string;
	questions: SurveyQuestion[];
	initialAnswers: { questionId: string; value: string }[];
}

export function UserSurveyDialog({
	open,
	onOpenChange,
	userId,
	userName,
	questions,
	initialAnswers,
}: UserSurveyDialogProps) {
	const queryClient = useQueryClient();

	const handleSave = async (
		answers: { questionId: string; value: string }[],
	) => {
		try {
			await saveAdminUserSurveyAnswersFn({ data: { userId, answers } });
			await queryClient.invalidateQueries({
				queryKey: adminUserDetailQueryOptions(userId).queryKey,
			});
			toast.success("Survey answers updated");
			onOpenChange(false);
		} catch {
			toast.error("Failed to update survey answers");
		}
	};

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit survey answers</DialogTitle>
					<DialogDescription>
						Update survey responses for {userName}.
					</DialogDescription>
				</DialogHeader>
				<SurveyAnswersForm
					initialAnswers={initialAnswers}
					onSave={handleSave}
					questions={questions}
					submitLabel="Save answers"
				/>
			</DialogContent>
		</Dialog>
	);
}
