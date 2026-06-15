import type {
	ActiveSubmissionType,
	SubmissionFormData,
} from "./submission-form-types";

/** Build the form's initial values, preferring `initialData` over type defaults. */
export function buildSubmissionDefaultValues(
	initialData: Partial<SubmissionFormData> | undefined,
	defaultType: SubmissionFormData["type"],
	defaultConfig: ActiveSubmissionType["config"] | undefined,
): SubmissionFormData {
	return {
		type: initialData?.type || defaultType,
		title: initialData?.title || "",
		content: initialData?.content || "",
		authors: initialData?.authors || [
			{
				firstName: "",
				lastName: "",
				email: "",
				affiliationId: null,
				affiliationName: "",
				isPresenter: true,
			},
		],
		keywords: initialData?.keywords || [],
		file: initialData?.file || null,
		contentFormat: defaultConfig?.contentFormat || "TEXT",
		trackId: initialData?.trackId || null,
	};
}
