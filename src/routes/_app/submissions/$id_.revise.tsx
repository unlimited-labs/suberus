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
	revisionReady,
} from "@/features/submissions/components/revise/revise-helpers";
import { useReviseSubmission } from "@/features/submissions/components/revise/use-revise-submission";
import { AuthorsInput } from "@/shared/components/authors-input";
import { FileDropzone } from "@/shared/components/file-dropzone";
import { PageHeader } from "@/shared/components/layout/page-header";
import type { Author } from "@/shared/types/author";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";

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

	if (!data) return <CannotReviseScreen kind="not-found" id={id} />;
	if (!isRevisableSubmission(data.submission)) {
		return <CannotReviseScreen kind="not-revisable" id={id} />;
	}

	return (
		<RevisionForm
			submissionId={id}
			title={view.title}
			content={view.content}
			initialAuthors={view.authors}
			initialKeywords={view.keywords}
			currentFile={view.currentFile}
			isFileFormat={view.isFileFormat}
			acceptString={view.acceptString}
			maxFileSize={view.maxFileSize}
			enableKeywords={view.enableKeywords}
			maxKeywords={view.maxKeywords}
			extractionEnabled={view.extractionEnabled}
			isSubmitting={isSubmitting}
			isConditional={view.isConditional}
			onSubmit={submitRevision}
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
			<div className="flex-1 p-6 flex items-center justify-center">
				<div className="text-center">
					<p className="text-muted-foreground mb-4">
						{kind === "not-found"
							? "Submission not found"
							: "Submission is not in a revisable state"}
					</p>
					<Link to="/submissions/$id" params={{ id }}>
						<Button variant="outline" className="gap-2">
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
	const [title, setTitle] = useState(initialTitle);
	const [content, setContent] = useState(initialContent);
	const [comment, setComment] = useState("");
	const [file, setFile] = useState<File | null>(null);
	const [authors, setAuthors] = useState<Author[]>(initialAuthors);
	const [keywords, setKeywords] = useState<string[]>(initialKeywords);

	// A newly uploaded document re-extracts and overwrites the metadata fields so
	// a changed title / author composition / keywords are picked up on revision.
	const { isExtracting, elapsedSeconds, handleFileChange } =
		useDocumentExtraction({
			enabled: extractionEnabled,
			skipExtraction: false,
			onExtracted: ({ title: t, authors: a, keywords: k }) => {
				if (t) setTitle(t);
				if (a) setAuthors(a);
				if (k) setKeywords(k);
			},
		});

	const handleSubmit = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		await onSubmit({ title, content, comment, file, authors, keywords });
	};

	return (
		<div className="flex h-full flex-col">
			<PageHeader
				icon={IconFileText}
				title={isConditional ? "Upload Revised Version" : "Revise Submission"}
			>
				<Link to="/submissions/$id" params={{ id: submissionId }}>
					<Button variant="outline" className="gap-2">
						<IconArrowLeft className="size-4" />
						Back to Submission
					</Button>
				</Link>
			</PageHeader>

			<div className="flex-1 overflow-auto p-6">
				<div className="mx-auto max-w-3xl">
					<form onSubmit={handleSubmit} className="space-y-6">
						<div className="space-y-2">
							<Label htmlFor="title">Title</Label>
							<input
								id="title"
								type="text"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
							/>
						</div>

						{isFileFormat ? (
							<div className="relative space-y-3">
								<ExtractionOverlay
									isExtracting={isExtracting}
									elapsedSeconds={elapsedSeconds}
								/>
								<Label>Document *</Label>
								{currentFile && !file && (
									<div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/30">
										<IconFile className="size-5 text-primary" />
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium truncate">
												{currentFile.originalName}
											</p>
											<p className="text-xs text-muted-foreground">
												Current file
											</p>
										</div>
										<Button
											variant="outline"
											size="sm"
											className="gap-2"
											asChild
										>
											<a
												href={`/api/files/${currentFile.id}`}
												data-testid="file-download-button"
											>
												<IconDownload className="size-4" />
												Download
											</a>
										</Button>
									</div>
								)}
								<FileDropzone
									value={file}
									onChange={(f) => handleFileChange(f, setFile)}
									accept={acceptString}
									maxSize={maxFileSize}
								/>
								<p className="text-xs text-muted-foreground">
									{`A revised document is required. Accepted formats: ${acceptString.replace(/\./g, "").toUpperCase()}`}
								</p>
							</div>
						) : (
							<div className="space-y-2">
								<Label htmlFor="content">Abstract</Label>
								<Textarea
									id="content"
									value={content}
									onChange={(e) => setContent(e.target.value)}
									rows={12}
									className="resize-none"
								/>
							</div>
						)}

						<div className="space-y-4">
							<div className="flex items-center gap-3">
								<IconUsers className="size-5 text-muted-foreground" />
								<h2 className="text-lg font-semibold text-foreground">
									Authors
								</h2>
							</div>
							<AuthorsInput value={authors} onChange={setAuthors} />
						</div>

						{enableKeywords && (
							<div className="space-y-4">
								<div className="flex items-center gap-3">
									<IconTags className="size-5 text-muted-foreground" />
									<h2 className="text-lg font-semibold text-foreground">
										Keywords
									</h2>
								</div>
								<div className="rounded-lg border bg-muted/30 p-3">
									<KeywordsInput
										value={keywords}
										onChange={setKeywords}
										maxKeywords={maxKeywords}
									/>
								</div>
							</div>
						)}

						<div className="space-y-2">
							<Label htmlFor="comment">
								Revision Notes{" "}
								<span className="text-muted-foreground text-xs font-normal">
									(Optional)
								</span>
							</Label>
							<Textarea
								id="comment"
								value={comment}
								onChange={(e) => setComment(e.target.value)}
								rows={4}
								placeholder="Describe the changes you made in this revision..."
								className="resize-none"
							/>
						</div>

						<Button
							type="submit"
							disabled={
								isSubmitting ||
								isExtracting ||
								!revisionReady(title, authors) ||
								(isFileFormat && !file)
							}
							className="w-full gap-2"
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
					</form>
				</div>
			</div>
		</div>
	);
}
