import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
	submissionTypesConfigQueryOptions,
	updateSubmissionTypeConfigFn,
} from "@/features/settings/api/settings";
import type { SupportedFileExtension } from "@/features/settings/file-types";
import type {
	SubmissionTypeConfig,
	SubmissionTypeKey,
} from "@/features/settings/types";
import { SUBMISSION_TYPE_DISPLAY_NAMES } from "@/features/settings/types";
import { submissionTypeUpdateSchema } from "@/features/settings/validations";
import { getErrorMessage } from "@/shared/lib/error-message";

interface UseSubmissionTypeConfigArgs {
	typeKey: SubmissionTypeKey;
	config: SubmissionTypeConfig;
	onChange: (updated: SubmissionTypeConfig) => void;
}

export function useSubmissionTypeConfig({
	typeKey,
	config,
	onChange,
}: UseSubmissionTypeConfigArgs) {
	const queryClient = useQueryClient();
	const [isSaving, setIsSaving] = useState(false);
	const [attempted, setAttempted] = useState(false);

	const displayName = SUBMISSION_TYPE_DISPLAY_NAMES[typeKey];

	const handleChange = <K extends keyof SubmissionTypeConfig>(
		field: K,
		value: SubmissionTypeConfig[K],
	) => {
		onChange({ ...config, [field]: value });
	};

	const selectExtension = (ext: SupportedFileExtension) =>
		handleChange("allowedExtensions", [ext]);

	const addCriterion = () => {
		handleChange("scoringCriteria", [
			...config.scoringCriteria,
			{ name: "", description: "" },
		]);
	};

	const removeCriterion = (index: number) => {
		handleChange(
			"scoringCriteria",
			config.scoringCriteria.filter((_, i) => i !== index),
		);
	};

	const updateCriterion = (
		index: number,
		field: "name" | "description",
		value: string,
	) => {
		const updated = config.scoringCriteria.map((c, i) =>
			i === index ? { ...c, [field]: value } : c,
		);
		handleChange("scoringCriteria", updated);
	};

	const parsed = submissionTypeUpdateSchema.safeParse({
		type: typeKey,
		config,
	});
	const errors =
		attempted && !parsed.success
			? parsed.error.issues.map((issue) => issue.message)
			: [];

	const handleSave = async () => {
		setAttempted(true);
		if (!parsed.success) {
			return;
		}

		setIsSaving(true);
		try {
			await updateSubmissionTypeConfigFn({
				data: { type: typeKey, config },
			});
			await queryClient.invalidateQueries({
				queryKey: submissionTypesConfigQueryOptions().queryKey,
			});
			toast.success(`"${displayName}" settings saved`);
		} catch (error) {
			toast.error(getErrorMessage(error, "Failed to save settings"));
		}
		setIsSaving(false);
	};

	return {
		isSaving,
		errors,
		displayName,
		handleChange,
		selectExtension,
		addCriterion,
		removeCriterion,
		updateCriterion,
		handleSave,
	};
}

export type SubmissionTypeConfigHandleChange = <
	K extends keyof SubmissionTypeConfig,
>(
	field: K,
	value: SubmissionTypeConfig[K],
) => void;
