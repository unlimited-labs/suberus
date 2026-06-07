import { IconArrowLeft, IconFileText } from "@tabler/icons-react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
	SubmissionForm,
	type SubmissionFormData,
} from "@/components/forms/submission/submission-form";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
	activeSubmissionTypesQueryOptions,
	submissionGuidelinesQueryOptions,
	submissionValidationQueryOptions,
} from "@/server-fns/settings";
import { extractionSettingsQueryOptions } from "@/server-fns/settings/extraction";
import {
	mySubmissionsQueryOptions,
	submissionDetailQueryOptions,
	submitDraftFn,
	updateDraftSubmissionFn,
	uploadSubmissionFile,
} from "@/server-fns/submissions";

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
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	if (
		!data ||
		data.submission.role === "coauthor" ||
		data.submission.status !== "DRAFT"
	) {
		return (
			<div className="flex h-full flex-col">
				<PageHeader icon={IconFileText} title="Cannot Edit" />
				<div className="flex-1 p-6 flex items-center justify-center">
					<div className="text-center">
						<p className="text-muted-foreground mb-4">
							{!data
								? "Submission not found"
								: "Submission can only be edited in Draft status"}
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

	const { submission } = data;
	const isDraft = submission.status === "DRAFT";

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
						versionNumber: submission.currentVersion,
						fileName: formData.file.name,
						fileBase64: base64,
					},
				});

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
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: submissionDetailQueryOptions(id).queryKey,
			}),
			queryClient.invalidateQueries({
				queryKey: mySubmissionsQueryOptions().queryKey,
			}),
		]);
		navigate({ to: "/submissions/$id", params: { id } });
	};

	const handleSaveDraft = isDraft
		? async (formData: SubmissionFormData) => {
				const saved = await saveSubmission(formData, true);
				if (!saved) return;
				toast.success("Draft saved");
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: submissionDetailQueryOptions(id).queryKey,
					}),
					queryClient.invalidateQueries({
						queryKey: mySubmissionsQueryOptions().queryKey,
					}),
				]);
				navigate({ to: "/submissions/$id", params: { id } });
			}
		: undefined;

	return (
		<div className="flex h-full flex-col">
			<PageHeader
				icon={IconFileText}
				title={isDraft ? "Edit Draft" : "Edit Submission"}
			>
				<Link to="/submissions/$id" params={{ id }}>
					<Button variant="outline" className="gap-2">
						<IconArrowLeft className="size-4" />
						Back
					</Button>
				</Link>
			</PageHeader>
			<div className="flex-1 overflow-auto p-6">
				<SubmissionForm
					onSubmit={handleSubmit}
					onSaveDraft={handleSaveDraft}
					initialData={initialData}
					typeConfigs={typeConfigs}
					validationSettings={validationSettings}
					guidelines={submissionGuidelines}
					extractionEnabled={extractionSettings.enabled}
				/>
			</div>
		</div>
	);
}
