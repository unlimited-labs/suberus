import type { StandardSchemaV1 } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import type { ConferenceSettings } from "@/features/settings/api/settings";
import {
	conferenceSettingsQueryOptions,
	updateConferenceSettingsFn,
} from "@/features/settings/api/settings";
import {
	conferenceBasicSchema,
	conferenceDatesSchema,
	conferenceFormatSchema,
} from "@/features/settings/validations";
import { useAppForm } from "@/shared/hooks/use-app-form";
import { getErrorMessage } from "@/shared/lib/error-message";

function useSectionSave() {
	const queryClient = useQueryClient();
	const router = useRouter();

	return async (patch: Partial<ConferenceSettings>) => {
		try {
			await updateConferenceSettingsFn({ data: patch });
		} catch (error) {
			toast.error(getErrorMessage(error, "Failed to save"));
			return;
		}
		await queryClient.invalidateQueries({
			queryKey: conferenceSettingsQueryOptions().queryKey,
		});
		await router.invalidate();
		toast.success("Conference settings saved");
	};
}

function useSectionForm<T extends Partial<ConferenceSettings>>(
	defaultValues: T,
	schema: StandardSchemaV1<T>,
) {
	const save = useSectionSave();
	return useAppForm({
		defaultValues,
		validators: { onChange: schema, onSubmit: schema },
		onSubmit: ({ value }) => save(value),
	});
}

export function useConferenceBasicForm(initial: ConferenceSettings) {
	return useSectionForm(
		{
			name: initial.name,
			subtitle: initial.subtitle,
			location: initial.location,
			website: initial.website,
			contactEmail: initial.contactEmail,
			currency: initial.currency,
		},
		conferenceBasicSchema,
	);
}

export function useConferenceDatesForm(initial: ConferenceSettings) {
	return useSectionForm(
		{
			conferenceStartDate: initial.conferenceStartDate,
			conferenceEndDate: initial.conferenceEndDate,
			submissionDeadline: initial.submissionDeadline,
			submissionsLocked: initial.submissionsLocked,
			reviewDeadline: initial.reviewDeadline,
			notificationDate: initial.notificationDate,
			registrationDeadline: initial.registrationDeadline,
			registrationLocked: initial.registrationLocked,
		},
		conferenceDatesSchema,
	);
}

export function useConferenceFormatForm(initial: ConferenceSettings) {
	return useSectionForm(
		{
			dateFormat: initial.dateFormat,
			timeFormat: initial.timeFormat,
			timezone: initial.timezone,
		},
		conferenceFormatSchema,
	);
}

export type ConferenceBasicFormApi = ReturnType<typeof useConferenceBasicForm>;
export type ConferenceDatesFormApi = ReturnType<typeof useConferenceDatesForm>;
export type ConferenceFormatFormApi = ReturnType<
	typeof useConferenceFormatForm
>;
