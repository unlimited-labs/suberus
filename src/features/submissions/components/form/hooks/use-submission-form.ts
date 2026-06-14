import { useStore } from "@tanstack/react-form";
import { useEffect, useMemo, useRef, useState } from "react";

import type { AvailableTrack } from "@/features/submissions/types";
import { getAffiliationById } from "@/server-fns/affiliations";
import { useAppForm } from "@/shared/hooks/use-app-form";
import { useSession } from "@/shared/hooks/use-session";

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
import { useDocumentExtraction } from "../use-document-extraction";

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
	const hasAutoFilledRef = useRef(false);
	const isFetchingAffiliationRef = useRef(false);

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
		defaultValues: {
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
		} satisfies SubmissionFormData,
		validators: {
			onChange: submissionSchema,
			onSubmit: submissionSchema,
		},
		onSubmit: async ({ value }) => {
			await onSubmit(value);
		},
	});

	// Auto-fill first author with user data (only for new submissions)
	useEffect(() => {
		if (initialData?.authors) return;
		if (!user) return;

		const authors = form.state.values.authors;
		const firstAuthor = authors[0];
		const isEmpty =
			!firstAuthor?.firstName && !firstAuthor?.lastName && !firstAuthor?.email;
		const needsAffiliation =
			firstAuthor &&
			!firstAuthor.affiliationName &&
			user.affiliationId &&
			!isFetchingAffiliationRef.current;

		// Case 1: First auto-fill - user data is available and first author is empty
		if (isEmpty && !hasAutoFilledRef.current) {
			hasAutoFilledRef.current = true;

			if (user.affiliationId) {
				isFetchingAffiliationRef.current = true;
				getAffiliationById({ data: { id: user.affiliationId } })
					.then((affiliation) => {
						form.setFieldValue("authors", [
							{
								firstName: user.firstName ?? "",
								lastName: user.lastName ?? "",
								email: user.email ?? "",
								affiliationId: user.affiliationId ?? null,
								affiliationName: affiliation?.name ?? "",
								isPresenter: true,
							},
							...authors.slice(1),
						]);
					})
					.catch(() => {
						form.setFieldValue("authors", [
							{
								firstName: user.firstName ?? "",
								lastName: user.lastName ?? "",
								email: user.email ?? "",
								affiliationId: user.affiliationId ?? null,
								affiliationName: "",
								isPresenter: true,
							},
							...authors.slice(1),
						]);
					})
					.finally(() => {
						isFetchingAffiliationRef.current = false;
					});
			} else {
				form.setFieldValue("authors", [
					{
						firstName: user.firstName ?? "",
						lastName: user.lastName ?? "",
						email: user.email ?? "",
						affiliationId: null,
						affiliationName: "",
						isPresenter: true,
					},
					...authors.slice(1),
				]);
			}
		}
		// Case 2: User was already filled but affiliationId became available later
		else if (
			needsAffiliation &&
			hasAutoFilledRef.current &&
			user.affiliationId
		) {
			const affiliationId = user.affiliationId;
			isFetchingAffiliationRef.current = true;
			getAffiliationById({ data: { id: affiliationId } })
				.then((affiliation) => {
					if (affiliation) {
						const currentAuthors = form.state.values.authors;
						const updatedAuthors = [...currentAuthors];
						updatedAuthors[0] = {
							...updatedAuthors[0],
							affiliationId: affiliationId,
							affiliationName: affiliation.name,
						};
						form.setFieldValue("authors", updatedAuthors);
					}
				})
				.catch(() => {
					// Silently fail - AffiliationSelect has its own fallback
				})
				.finally(() => {
					isFetchingAffiliationRef.current = false;
				});
		}
	}, [user, initialData?.authors, form]);

	const values = useStore(form.store, (state) => state.values);
	const submissionAttempts = useStore(
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
				hasAutoFilledRef.current = true;
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
