import { useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import {
	submissionTypesConfigQueryOptions,
	updateSubmissionTypeConfigFn,
} from "@/features/settings/api/settings";
import type {
	SubmissionTypeConfig,
	SubmissionTypeKey,
} from "@/features/settings/types";
import { SUBMISSION_TYPE_DISPLAY_NAMES } from "@/features/settings/types";
import {
	type SubmissionTypeFormValues,
	submissionTypeFormSchema,
} from "@/features/settings/validations";
import { useAppForm } from "@/shared/hooks/use-app-form";
import { getErrorMessage } from "@/shared/lib/error-message";

interface UseSubmissionTypeConfigArgs {
	typeKey: SubmissionTypeKey;
	config: SubmissionTypeConfig;
}

function toFormValues(config: SubmissionTypeConfig): SubmissionTypeFormValues {
	return {
		...config,
		maxFileSizeMb: String(config.maxFileSizeMb),
		maxSubmissionsPerUser: String(config.maxSubmissionsPerUser),
		requiredReviewers: String(config.requiredReviewers),
		reviewDeadlineDays: String(config.reviewDeadlineDays),
	};
}

export function useSubmissionTypeConfig({
	typeKey,
	config,
}: UseSubmissionTypeConfigArgs) {
	const queryClient = useQueryClient();
	const displayName = SUBMISSION_TYPE_DISPLAY_NAMES[typeKey];
	const schema = useMemo(() => submissionTypeFormSchema(typeKey), [typeKey]);

	const form = useAppForm({
		defaultValues: toFormValues(config),
		validators: { onChange: schema, onSubmit: schema },
		onSubmit: async ({ value }) => {
			try {
				await updateSubmissionTypeConfigFn({
					data: { type: typeKey, config: schema.parse(value) },
				});
				await queryClient.invalidateQueries({
					queryKey: submissionTypesConfigQueryOptions().queryKey,
				});
				toast.success(`"${displayName}" settings saved`);
			} catch (error) {
				toast.error(getErrorMessage(error, "Failed to save settings"));
			}
		},
	});

	return { form, displayName };
}

export type SubmissionTypeFormApi = ReturnType<
	typeof useSubmissionTypeConfig
>["form"];
