import {
	IconArrowLeft,
	IconDownload,
	IconFile,
	IconFileText,
	IconSend,
	IconTags,
	IconUsers,
} from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSelector } from "@tanstack/react-store";
import { useState } from "react";
import { extractionSettingsQueryOptions } from "@/features/extraction/api/extraction";
import { ExtractionOverlay } from "@/features/extraction/components/extraction-overlay";
import { useDocumentExtraction } from "@/features/extraction/hooks/use-document-extraction";
import {
	activeSubmissionTypesQueryOptions,
	submissionValidationQueryOptions,
} from "@/features/settings/api/settings";
import { submissionDetailQueryOptions } from "@/features/submissions/api/submissions";
import { KeywordsInput } from "@/features/submissions/components/form/keywords-input";
import {
	isRevisableSubmission,
	prepareRevisionView,
	revisionFormSchema,
	revisionReady,
} from "@/features/submissions/components/revise/revise-helpers";
import { useReviseSubmission } from "@/features/submissions/components/revise/use-revise-submission";
import { AuthorsInput } from "@/shared/components/authors-input";
import { Form } from "@/shared/components/composable/form";
import { FileDropzone } from "@/shared/components/file-dropzone";
import { PageHeader } from "@/shared/components/layout/page-header";
import { useAppForm } from "@/shared/hooks/use-app-form";
import { isFieldErrorVisible } from "@/shared/hooks/use-field-error";
import type { Author } from "@/shared/types/author";
import { Button } from "@/shared/ui/button";
import { Field, FieldError } from "@/shared/ui/field";
import { Label } from "@/shared/ui/label";

export const Route = createFileRoute("/_app/submissions/$id_/revise")({
	loader: async ({ params, context }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(
				submissionDetailQueryOptions(params.id),
			),
			context.queryClient.ensureQueryData(activeSubmissionTypesQueryOptions()),
			context.queryClient.ensureQueryData(submissionValidationQueryOptions()),
			context.queryClient.ensureQueryData(extractionSettingsQueryOptions()),
		]);
	},
	component: ReviseSubmissionPage,
});

function ReviseSubmissionPage() {
	const { id } = Route.useParams();
	const { data } = useSuspenseQuery(submissionDetailQueryOptions(id));
	const { data: typeConfigs } = useSuspenseQuery(
		activeSubmissionTypesQueryOptions(),
	);
	const { data: validationSettings } = useSuspenseQuery(
		submissionValidationQueryOptions(),
	);
	const { data: extractionSettings } = useSuspenseQuery(
		extractionSettingsQueryOptions(),
	);

	const view = prepareRevisionView(data, typeConfigs, {
		enableKeywords: validationSettings.enableKeywords,
		maxKeywords: validationSettings.maxKeywords,
		extractionEnabled: extractionSettings.enabled,
	});
	const { isSubmitting, submitRevision } = useReviseSubmission({
		id,
		isConditional: view.isConditional,
	});

	if (!data) return <CannotReviseScreen id={id} kind="not-found" />;
	if (!isRevisableSubmission(data.submission)) {
		return <CannotReviseScreen id={id} kind="not-revisable" />;
	}

	return (
		<RevisionForm
			acceptString={view.acceptString}
			content={view.content}
			currentFile={view.currentFile}
			enableKeywords={view.enableKeywords}
			extractionEnabled={view.extractionEnabled}
			initialAuthors={view.authors}
			initialKeywords={view.keywords}
			isConditional={view.isConditional}
			isFileFormat={view.isFileFormat}
			isSubmitting={isSubmitting}
			maxFileSize={view.maxFileSize}
			maxKeywords={view.maxKeywords}
			onSubmit={submitRevision}
			submissionId={id}
			title={view.title}
		/>
	);
}

function CannotReviseScreen({
	kind,
	id,
}: {
	kind: "not-found" | "not-revisable";
	id: string;
}) {
	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconFileText} title="Cannot Revise" />
			<div className="flex flex-1 items-center justify-center p-6">
				<div className="text-center">
					<p className="text-muted-foreground mb-4">
						{kind === "not-found"
							? "Submission not found"
							: "Submission is not in a revisable state"}
					</p>
					<Link params={{ id }} to="/submissions/$id">
						<Button className="gap-2" variant="outline">
							<IconArrowLeft className="size-4" />
							Back to Submission
						</Button>
					</Link>
				</div>
			</div>
		</div>
	);
}

interface RevisionFormProps {
	submissionId: string;
	title: string;
	content: string;
	initialAuthors: Author[];
	initialKeywords: string[];
	currentFile: {
		id: string;
		fileName: string;
		originalName: string;
		mimeType: string;
		size: number;
	} | null;
	isFileFormat: boolean;
	acceptString: string;
	maxFileSize: number;
	enableKeywords: boolean;
	maxKeywords: number;
	extractionEnabled: boolean;
	isSubmitting: boolean;
	isConditional: boolean;
	onSubmit: (data: {
		title: string;
		content: string;
		comment: string;
		file: File | null;
		authors: Author[];
		keywords: string[];
	}) => Promise<void>;
}

function RevisionForm({
	submissionId,
	title: initialTitle,
	content: initialContent,
	initialAuthors,
	initialKeywords,
	currentFile,
	isFileFormat,
	acceptString,
	maxFileSize,
	enableKeywords,
	maxKeywords,
	extractionEnabled,
	isSubmitting,
	isConditional,
	onSubmit,
}: RevisionFormProps) {
	const [file, setFile] = useState<File | null>(null);

	const form = useAppForm({
		defaultValues: {
			title: initialTitle,
			content: initialContent,
			comment: "",
			authors: initialAuthors,
			keywords: initialKeywords,
		},
		validators: { onChange: revisionFormSchema, onSubmit: revisionFormSchema },
		onSubmit: ({ value }) => onSubmit({ ...value, file }),
	});

	const authors = useSelector(form.store, (s) => s.values.authors);
	const keywords = useSelector(form.store, (s) => s.values.keywords);
	const title = useSelector(form.store, (s) => s.values.title);
	const submissionAttempts = useSelector(
		form.store,
		(s) => s.submissionAttempts,
	);

	const { isExtracting, elapsedSeconds, handleFileChange } =
		useDocumentExtraction({
			enabled: extractionEnabled,
			skipExtraction: false,
			onExtracted: ({ title: t, authors: a, keywords: k }) => {
				if (t) form.setFieldValue("title", t);
				if (a) form.setFieldValue("authors", a);
				if (k) form.setFieldValue("keywords", k);
			},
		});

	return (
		<div className="flex h-full flex-col">
			<PageHeader
				icon={IconFileText}
				title={isConditional ? "Upload Revised Version" : "Revise Submission"}
			>
				<Link params={{ id: submissionId }} to="/submissions/$id">
					<Button className="gap-2" variant="outline">
						<IconArrowLeft className="size-4" />
						Back to Submission
					</Button>
				</Link>
			</PageHeader>

			<div className="flex-1 overflow-auto p-6">
				<div className="mx-auto max-w-3xl">
					<Form className="space-y-6" onSubmit={() => void form.handleSubmit()}>
						<form.AppField name="title">
							{(field) => <field.InputField label="Title" />}
						</form.AppField>

						{isFileFormat ? (
							<div className="relative space-y-3">
								<ExtractionOverlay
									elapsedSeconds={elapsedSeconds}
									isExtracting={isExtracting}
								/>
								<Label>Document *</Label>
								{currentFile && !file && (
									<div className="border-border/50 bg-muted/30 flex items-center gap-3 rounded-lg border p-3">
										<IconFile className="text-primary size-5" />
										<div className="min-w-0 flex-1">
											<p className="truncate text-sm font-medium">
												{currentFile.originalName}
											</p>
											<p className="text-muted-foreground text-xs">
												Current file
											</p>
										</div>
										<Button
											asChild
											className="gap-2"
											size="sm"
											variant="outline"
										>
											<a
												data-testid="file-download-button"
												href={`/api/files/${currentFile.id}`}
											>
												<IconDownload className="size-4" />
												Download
											</a>
										</Button>
									</div>
								)}
								<FileDropzone
									accept={acceptString}
									maxSize={maxFileSize}
									onChange={(f) => handleFileChange(f, setFile)}
									value={file}
								/>
								<p className="text-muted-foreground text-xs">
									{`A revised document is required. Accepted formats: ${acceptString.replace(/\./g, "").toUpperCase()}`}
								</p>
							</div>
						) : (
							<form.AppField name="content">
								{(field) => (
									<field.TextareaField
										className="resize-none"
										label="Abstract"
										rows={12}
									/>
								)}
							</form.AppField>
						)}

						<div className="space-y-4">
							<div className="flex items-center gap-3">
								<IconUsers className="text-muted-foreground size-5" />
								<h2 className="text-foreground text-lg font-semibold">
									Authors
								</h2>
							</div>
							<form.Field name="authors">
								{(field) => {
									const hasError = isFieldErrorVisible(
										field.state.meta,
										submissionAttempts,
									);
									return (
										<Field data-invalid={hasError}>
											<AuthorsInput
												onChange={field.handleChange}
												value={field.state.value}
											/>
											<FieldError
												errors={hasError ? field.state.meta.errors : undefined}
											/>
										</Field>
									);
								}}
							</form.Field>
						</div>

						{enableKeywords && (
							<div className="space-y-4">
								<div className="flex items-center gap-3">
									<IconTags className="text-muted-foreground size-5" />
									<h2 className="text-foreground text-lg font-semibold">
										Keywords
									</h2>
								</div>
								<div className="bg-muted/30 rounded-lg border p-3">
									<KeywordsInput
										maxKeywords={maxKeywords}
										onChange={(next) => form.setFieldValue("keywords", next)}
										value={keywords}
									/>
								</div>
							</div>
						)}

						<form.AppField name="comment">
							{(field) => (
								<field.TextareaField
									className="resize-none"
									label="Revision Notes (Optional)"
									placeholder="Describe the changes you made in this revision..."
									rows={4}
								/>
							)}
						</form.AppField>

						<Button
							className="w-full gap-2"
							disabled={
								isSubmitting ||
								isExtracting ||
								!revisionReady(title, authors) ||
								(isFileFormat && !file)
							}
							type="submit"
						>
							<IconSend className="size-4" />
							{isSubmitting
								? isConditional
									? "Uploading..."
									: "Submitting Revision..."
								: isConditional
									? "Upload Revised Version"
									: "Submit Revision"}
						</Button>
					</Form>
				</div>
			</div>
		</div>
	);
}
