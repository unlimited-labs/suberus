import { useSelector } from "@tanstack/react-store";
import { useCallback, useMemo, useState } from "react";
import { useDocumentExtraction } from "@/features/extraction/hooks/use-document-extraction";
import type { AvailableTrack } from "@/features/submissions/types";
import { useAppForm } from "@/shared/hooks/use-app-form";
import { useSession } from "@/shared/hooks/use-session";
import type { Author } from "@/shared/types/author";
import { buildSubmissionDefaultValues } from "../submission-form-defaults";
import {
	buildContentSchema,
	buildSubmissionFormSchema,
	substituteGuidelines,
} from "../submission-form-schema";
import type {
	ActiveSubmissionType,
	SubmissionFormData,
	ValidationSettings,
} from "../submission-form-types";
import { computeSubmissionProgress } from "../submission-progress";
import { useFirstAuthorAutofill } from "./use-first-author-autofill";

interface UseSubmissionFormArgs {
	onSubmit: (data: SubmissionFormData) => Promise<void>;
	onSaveDraft?: (data: SubmissionFormData) => Promise<void>;
	initialData?: Partial<SubmissionFormData>;
	typeConfigs: ActiveSubmissionType[];
	validationSettings: ValidationSettings;
	guidelines?: string;
	extractionEnabled?: boolean;
	/** Active tracks loaded by the route; rendered only when track selection applies. */
	availableTracks: AvailableTrack[];
}

type SubmissionType = "ABSTRACT" | "POSTER" | "FULL_PAPER";

/**
 * Owns all SubmissionForm behaviour: form instance, validation schemas,
 * first-author auto-fill, type-switch field cleanup, track loading, document
 * extraction and draft saving. Leaves the component as pure presentation.
 */
export function useSubmissionForm({
	onSubmit,
	onSaveDraft,
	initialData,
	typeConfigs,
	validationSettings,
	guidelines,
	extractionEnabled,
	availableTracks,
}: UseSubmissionFormArgs) {
	const [isSavingDraft, setIsSavingDraft] = useState(false);
	const { user } = useSession();

	const defaultType = typeConfigs[0]?.type || "ABSTRACT";
	const defaultConfig = typeConfigs[0]?.config;

	const [selectedType, setSelectedType] = useState<SubmissionType>(
		initialData?.type || defaultType,
	);

	const submissionSchema = useMemo(
		() => buildSubmissionFormSchema(validationSettings),
		[validationSettings],
	);
	const contentSchema = useMemo(
		() => buildContentSchema(validationSettings),
		[validationSettings],
	);
	const renderedGuidelines = useMemo(() => {
		if (!guidelines) return null;
		return substituteGuidelines(guidelines, validationSettings);
	}, [guidelines, validationSettings]);

	const form = useAppForm({
		defaultValues: buildSubmissionDefaultValues(
			initialData,
			defaultType,
			defaultConfig,
		),
		validators: {
			onChange: submissionSchema,
			onSubmit: submissionSchema,
		},
		onSubmit: async ({ value }) => {
			await onSubmit(value);
		},
	});

	const getAuthors = useCallback(() => form.state.values.authors, [form]);
	const setAuthors = useCallback(
		(authors: Author[]) => form.setFieldValue("authors", authors),
		[form],
	);
	const { markAutoFilled } = useFirstAuthorAutofill({
		user,
		hasInitialAuthors: !!initialData?.authors,
		getAuthors,
		setAuthors,
	});

	const values = useSelector(form.store, (state) => state.values);
	const submissionAttempts = useSelector(
		form.store,
		(state) => state.submissionAttempts,
	);

	const currentTypeConfig = typeConfigs.find((t) => t.type === selectedType);
	const isFileFormat = currentTypeConfig?.config.contentFormat === "FILE";

	const progress = computeSubmissionProgress(
		values,
		validationSettings,
		isFileFormat,
	);

	const allowedExtensions = currentTypeConfig?.config.allowedExtensions || [];
	const acceptString = allowedExtensions.map((ext) => `.${ext}`).join(",");

	const {
		isExtracting,
		elapsedSeconds,
		handleFileChange: handleFileWithExtraction,
	} = useDocumentExtraction({
		enabled: !!extractionEnabled,
		skipExtraction: !!initialData?.title,
		onExtracted: ({ title, authors, keywords }) => {
			if (title) form.setFieldValue("title", title);
			if (authors) {
				form.setFieldValue("authors", authors);
				markAutoFilled();
			}
			if (keywords) form.setFieldValue("keywords", keywords);
		},
	});

	/** Select a submission type: set the field, local state, and clean up format-specific fields. */
	const selectType = (value: SubmissionType) => {
		form.setFieldValue("type", value);
		setSelectedType(value);
		const newConfig = typeConfigs.find((t) => t.type === value);
		if (!newConfig) return;
		form.setFieldValue("contentFormat", newConfig.config.contentFormat);
		// Clear file if switching to TEXT format
		if (newConfig.config.contentFormat === "TEXT") {
			form.setFieldValue("file", null);
		}
		// Clear content and its stale validation errors when switching to FILE
		// format. setFieldValue triggers the field-level onChange validator before
		// React re-renders to remove it, leaving a stale error that blocks canSubmit.
		if (newConfig.config.contentFormat === "FILE") {
			form.setFieldValue("content", "");
			form.setFieldMeta("content", (prev) => ({
				...prev,
				errorMap: {},
				errorSourceMap: {},
			}));
		}
	};

	const saveDraft = async () => {
		if (!onSaveDraft) return;
		setIsSavingDraft(true);
		try {
			await onSaveDraft(form.state.values);
		} finally {
			setIsSavingDraft(false);
		}
	};

	return {
		form,
		submissionAttempts,
		contentSchema,
		renderedGuidelines,
		selectedType,
		selectType,
		currentTypeConfig,
		activeTracks: availableTracks,
		isFileFormat,
		allowedExtensions,
		acceptString,
		progress,
		isExtracting,
		elapsedSeconds,
		handleFileWithExtraction,
		isSavingDraft,
		saveDraft,
	};
}

/** The TanStack Form instance type, for sub-components that render its fields. */
export type SubmissionFormApi = ReturnType<typeof useSubmissionForm>["form"];
