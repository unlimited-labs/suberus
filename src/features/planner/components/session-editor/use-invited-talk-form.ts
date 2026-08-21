import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	createInvitedTalkFn,
	invitedTalkQueryOptions,
	updateInvitedTalkFn,
	updatePresentationDurationFn,
} from "@/features/planner/api/presentations";
import type { InvitedTalkDetail } from "@/features/planner/server/invited";
import { invitedTalkFormSchema } from "@/features/planner/validations";
import { useAppForm } from "@/shared/hooks/use-app-form";
import { getErrorMessage } from "@/shared/lib/error-message";
import { useInvalidatePlannerQueries } from "../hooks/use-invalidate-planner-queries";

interface UseInvitedTalkFormArgs {
	sessionId: string;
	talk: InvitedTalkDetail | null;
	defaultDurationMin: number;
	onClose: () => void;
}

export function useInvitedTalkForm({
	sessionId,
	talk,
	defaultDurationMin,
	onClose,
}: UseInvitedTalkFormArgs) {
	const invalidate = useInvalidatePlannerQueries();
	const queryClient = useQueryClient();

	const form = useAppForm({
		defaultValues: {
			title: talk?.title ?? "",
			abstract: talk?.abstract ?? "",
			speakerFirstName: talk?.speakerFirstName ?? "",
			speakerLastName: talk?.speakerLastName ?? "",
			affiliationName: talk?.affiliationName ?? "",
			durationMin: talk?.durationMin ?? defaultDurationMin,
		},
		validators: {
			onChange: invitedTalkFormSchema,
			onSubmit: invitedTalkFormSchema,
		},
		onSubmit: async ({ value }) => {
			const { durationMin, ...fields } = value;
			try {
				if (talk) {
					await updateInvitedTalkFn({ data: { id: talk.slotId, ...fields } });
					if (durationMin !== talk.durationMin) {
						await updatePresentationDurationFn({
							data: { id: talk.slotId, durationMin },
						});
					}
					queryClient.invalidateQueries({
						queryKey: invitedTalkQueryOptions(talk.slotId).queryKey,
					});
					toast.success("Invited talk updated");
				} else {
					await createInvitedTalkFn({
						data: { sessionId, durationMin, ...fields },
					});
					toast.success("Invited talk added");
				}
				invalidate();
				onClose();
			} catch (error) {
				toast.error(getErrorMessage(error, "Failed to save invited talk"));
			}
		},
	});

	return { form, isEdit: talk !== null };
}
