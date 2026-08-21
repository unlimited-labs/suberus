import { IconArrowLeft, IconFileText } from "@tabler/icons-react";
import {
	useQuery,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { extractionSettingsQueryOptions } from "@/features/extraction/api/extraction";
import {
	activeSubmissionTypesQueryOptions,
	submissionGuidelinesQueryOptions,
	submissionValidationQueryOptions,
} from "@/features/settings/api/settings";
import {
	invalidateSubmissionCaches,
	submissionDetailQueryOptions,
	submitDraftFn,
	updateDraftSubmissionFn,
	uploadSubmissionFile,
} from "@/features/submissions/api/submissions";
import {
	SubmissionForm,
	type SubmissionFormData,
} from "@/features/submissions/components/form/submission-form";
import { activeTracksQueryOptions } from "@/features/tracks/api/tracks";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/ui/button";

export const Route = createFileRoute("/_app/submissions/$id_/edit")({
	loader: async ({ params, context }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(
				submissionDetailQueryOptions(params.id),
			),
			context.queryClient.ensureQueryData(activeSubmissionTypesQueryOptions()),
			context.queryClient.ensureQueryData(submissionValidationQueryOptions()),
			context.queryClient.ensureQueryData(submissionGuidelinesQueryOptions()),
			context.queryClient.ensureQueryData(extractionSettingsQueryOptions()),
		]);
	},
	component: EditSubmissionPage,
});

function EditSubmissionPage() {
	const { id } = Route.useParams();
	const { data } = useSuspenseQuery(submissionDetailQueryOptions(id));
	const { data: typeConfigs } = useSuspenseQuery(
		activeSubmissionTypesQueryOptions(),
	);
	const { data: validationSettings } = useSuspenseQuery(
		submissionValidationQueryOptions(),
	);
	const { data: submissionGuidelines } = useSuspenseQuery(
		submissionGuidelinesQueryOptions(),
	);
	const { data: extractionSettings } = useSuspenseQuery(
		extractionSettingsQueryOptions(),
	);
	const { data: availableTracks = [] } = useQuery(activeTracksQueryOptions());
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const submission = data?.submission;

	if (
		!submission ||
		submission.role === "coauthor" ||
		submission.status !== "DRAFT" ||
		// Exhibitor entries are managed via the exhibitor flow, not this form
		submission.type === "EXHIBITOR"
	) {
		return (
			<div className="flex h-full flex-col">
				<PageHeader icon={IconFileText} title="Cannot Edit" />
				<div className="flex flex-1 items-center justify-center p-6">
					<div className="text-center">
						<p className="text-muted-foreground mb-4">
							{!submission
								? "Submission not found"
								: submission.type === "EXHIBITOR"
									? "Exhibitor entries cannot be edited here"
									: "Submission can only be edited in Draft status"}
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

	const isDraft = submission.status === "DRAFT";

	// A FILE draft may already have a file attached (uploaded on an earlier save);
	// relax the form's file requirement so a metadata-only edit isn't blocked.
	const hasExistingFile = data.versions.some(
		(v) => v.version === submission.currentVersion && v.file !== null,
	);

	const initialData: Partial<SubmissionFormData> = {
		type: submission.type,
		title: submission.title,
		content: submission.content,
		authors: submission.authors.map((a) => ({
			firstName: a.firstName,
			lastName: a.lastName,
			email: a.email,
			affiliationId: null,
			affiliationName: a.affiliation,
			isPresenter: a.isPresenter,
		})),
		keywords: submission.keywords,
	};

	const saveSubmission = async (
		formData: SubmissionFormData,
		asDraft: boolean,
	) => {
		let result: Awaited<ReturnType<typeof updateDraftSubmissionFn>>;
		try {
			result = await updateDraftSubmissionFn({
				data: {
					submissionId: id,
					type: formData.type,
					title: formData.title,
					content: formData.content,
					authors: formData.authors,
					keywords: formData.keywords,
					contentFormat: formData.contentFormat,
					trackId: formData.trackId,
					isDraft: asDraft,
				},
			});
		} catch {
			toast.error("Something went wrong. Please try again.");
			return false;
		}

		if (!result.success) {
			toast.error(result.error);
			return false;
		}

		// Upload file if needed
		if (formData.contentFormat === "FILE" && formData.file) {
			try {
				const uploadData = new FormData();
				uploadData.append("file", formData.file);
				uploadData.append("submissionId", id);
				uploadData.append("versionNumber", String(submission.currentVersion));

				const uploadResult = await uploadSubmissionFile({ data: uploadData });

				if (!uploadResult.success) {
					toast.error(`Saved but file upload failed: ${uploadResult.error}`);
				}
			} catch {
				toast.error("File upload failed");
			}
		}

		return true;
	};

	const handleSubmit = async (formData: SubmissionFormData) => {
		const saved = await saveSubmission(formData, false);
		if (!saved) return;

		// If it was a draft, also transition to SUBMITTED
		if (isDraft) {
			const submitResult = await submitDraftFn({
				data: { submissionId: id },
			});
			if (!submitResult.success) {
				toast.error(submitResult.error ?? "Submit failed");
				return;
			}
		}

		toast.success(isDraft ? "Submission submitted" : "Submission updated");
		await invalidateSubmissionCaches(queryClient, id);
		navigate({ to: "/submissions/$id", params: { id } });
	};

	return (
		<div className="flex h-full flex-col">
			<PageHeader
				icon={IconFileText}
				title={isDraft ? "Edit Draft" : "Edit Submission"}
			>
				<Link params={{ id }} to="/submissions/$id">
					<Button className="gap-2" variant="outline">
						<IconArrowLeft className="size-4" />
						Back
					</Button>
				</Link>
			</PageHeader>
			<div className="flex-1 overflow-auto p-6">
				<SubmissionForm
					availableTracks={availableTracks}
					extractionEnabled={extractionSettings.enabled}
					guidelines={submissionGuidelines}
					hasExistingFile={hasExistingFile}
					initialData={initialData}
					onSaveDraft={
						isDraft
							? async (formData: SubmissionFormData) => {
									const saved = await saveSubmission(formData, true);
									if (!saved) return;
									toast.success("Draft saved");
									await invalidateSubmissionCaches(queryClient, id);
									navigate({ to: "/submissions/$id", params: { id } });
								}
							: undefined
					}
					onSubmit={handleSubmit}
					typeConfigs={typeConfigs}
					validationSettings={validationSettings}
				/>
			</div>
		</div>
	);
}
