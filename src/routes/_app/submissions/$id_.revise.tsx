import {
	IconArrowLeft,
	IconFile,
	IconFileText,
	IconSend,
} from "@tabler/icons-react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { FileDropzone } from "@/components/forms/submission/file-dropzone";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	activeSubmissionTypesQueryOptions,
	submissionValidationQueryOptions,
} from "@/server-fns/settings";
import {
	mySubmissionsQueryOptions,
	resubmitSubmissionFn,
	submissionDetailQueryOptions,
	uploadSubmissionFile,
} from "@/server-fns/submissions";

export const Route = createFileRoute("/_app/submissions/$id_/revise")({
	loader: async ({ params, context }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(
				submissionDetailQueryOptions(params.id),
			),
			context.queryClient.ensureQueryData(activeSubmissionTypesQueryOptions()),
			context.queryClient.ensureQueryData(submissionValidationQueryOptions()),
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
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [isSubmitting, setIsSubmitting] = useState(false);

	if (
		!data ||
		data.submission.role === "coauthor" ||
		data.submission.status !== "REVISE_REQUIRED"
	) {
		return (
			<div className="flex h-full flex-col">
				<PageHeader icon={IconFileText} title="Cannot Revise" />
				<div className="flex-1 p-6 flex items-center justify-center">
					<div className="text-center">
						<p className="text-muted-foreground mb-4">
							{!data
								? "Submission not found"
								: "Submission is not in revision-required state"}
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

	const { submission, versions } = data;
	const currentVersion = versions.find(
		(v) => v.version === submission.currentVersion,
	);

	// Determine content format from type config
	const typeConfig = typeConfigs.find((t) => t.type === submission.type);
	const contentFormat = typeConfig?.config.contentFormat ?? "TEXT";
	const isFileFormat = contentFormat === "FILE";

	// File type settings - use type-specific config with dot prefix (matching submission-form.tsx)
	const allowedExtensions = typeConfig?.config.allowedExtensions || [];
	const acceptString =
		allowedExtensions.length > 0
			? allowedExtensions.map((ext: string) => `.${ext}`).join(",")
			: ".pdf,.doc,.docx";
	const maxFileSize = validationSettings.maxFileSize ?? 10;

	return (
		<RevisionForm
			submissionId={id}
			title={currentVersion?.title ?? submission.title}
			content={currentVersion?.content ?? submission.content}
			currentFile={currentVersion?.file ?? null}
			isFileFormat={isFileFormat}
			acceptString={acceptString}
			maxFileSize={maxFileSize}
			isSubmitting={isSubmitting}
			onSubmit={async (formData) => {
				setIsSubmitting(true);
				try {
					const result = await resubmitSubmissionFn({
						data: {
							submissionId: id,
							title: formData.title,
							content: formData.content,
							comment: formData.comment || undefined,
						},
					});

					if (!result.success) {
						toast.error(result.error ?? "Resubmission failed");
						return;
					}

					// Upload file if FILE format with new file
					if (isFileFormat && formData.file) {
						try {
							const buffer = await formData.file.arrayBuffer();
							const base64 = btoa(
								new Uint8Array(buffer).reduce(
									(d, byte) => d + String.fromCharCode(byte),
									"",
								),
							);

							const uploadResult = await uploadSubmissionFile({
								data: {
									submissionId: id,
									versionNumber: result.versionNumber,
									fileName: formData.file.name,
									mimeType: formData.file.type,
									fileBase64: base64,
								},
							});

							if (!uploadResult.success) {
								toast.error(
									`Revision saved but file upload failed: ${uploadResult.error}`,
								);
							}
						} catch {
							toast.error("File upload failed");
						}
					}

					toast.success("Revision submitted successfully");
					await Promise.all([
						queryClient.invalidateQueries({
							queryKey: submissionDetailQueryOptions(id).queryKey,
						}),
						queryClient.invalidateQueries({
							queryKey: mySubmissionsQueryOptions().queryKey,
						}),
					]);
					navigate({ to: "/submissions/$id", params: { id } });
				} catch {
					toast.error("Resubmission failed");
				} finally {
					setIsSubmitting(false);
				}
			}}
		/>
	);
}

interface RevisionFormProps {
	submissionId: string;
	title: string;
	content: string;
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
	isSubmitting: boolean;
	onSubmit: (data: {
		title: string;
		content: string;
		comment: string;
		file: File | null;
	}) => Promise<void>;
}

function RevisionForm({
	submissionId,
	title: initialTitle,
	content: initialContent,
	currentFile,
	isFileFormat,
	acceptString,
	maxFileSize,
	isSubmitting,
	onSubmit,
}: RevisionFormProps) {
	const [title, setTitle] = useState(initialTitle);
	const [content, setContent] = useState(initialContent);
	const [comment, setComment] = useState("");
	const [file, setFile] = useState<File | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		await onSubmit({ title, content, comment, file });
	};

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconFileText} title="Revise Submission">
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
						{/* Title */}
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

						{/* Content / File */}
						{isFileFormat ? (
							<div className="space-y-3">
								<Label>Document *</Label>
								{currentFile && !file && (
									<div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
										<IconFile className="size-5 text-primary" />
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium truncate">
												{currentFile.originalName}
											</p>
											<p className="text-xs text-muted-foreground">
												Current file
											</p>
										</div>
									</div>
								)}
								<FileDropzone
									value={file}
									onChange={setFile}
									accept={acceptString}
									maxSize={maxFileSize}
								/>
								<p className="text-xs text-muted-foreground">
									{currentFile
										? "Upload a new file to replace the current one, or leave empty to keep the existing file."
										: `Accepted formats: ${acceptString.replace(/\./g, "").toUpperCase()}`}
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

						{/* Revision Comment */}
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

						{/* Submit */}
						<Button
							type="submit"
							disabled={isSubmitting || !title.trim()}
							className="w-full gap-2"
						>
							<IconSend className="size-4" />
							{isSubmitting ? "Submitting Revision..." : "Submit Revision"}
						</Button>
					</form>
				</div>
			</div>
		</div>
	);
}
