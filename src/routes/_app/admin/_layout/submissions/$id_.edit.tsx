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
	adminEditSubmissionFn,
	adminSubmitDraftFn,
	editorSubmissionQueryOptions,
} from "@/features/submissions/api/admin-submissions";
import { adminUploadSubmissionFile } from "@/features/submissions/api/submissions";
import {
	SubmissionForm,
	type SubmissionFormData,
} from "@/features/submissions/components/form/submission-form";
import { activeTracksQueryOptions } from "@/features/tracks/api/tracks";
import { PageHeader } from "@/shared/components/layout/page-header";
import { useAdminAuth } from "@/shared/hooks/use-admin-auth";
import { Button } from "@/shared/ui/button";

export const Route = createFileRoute(
	"/_app/admin/_layout/submissions/$id_/edit",
)({
	loader: async ({ params, context }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(
				editorSubmissionQueryOptions(params.id),
			),
			context.queryClient.ensureQueryData(activeSubmissionTypesQueryOptions()),
			context.queryClient.ensureQueryData(submissionValidationQueryOptions()),
			context.queryClient.ensureQueryData(submissionGuidelinesQueryOptions()),
			context.queryClient.ensureQueryData(extractionSettingsQueryOptions()),
		]);
	},
	component: AdminEditSubmissionPage,
});

function AdminEditSubmissionPage() {
	const { id } = Route.useParams();
	const { data } = useSuspenseQuery(editorSubmissionQueryOptions(id));
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
	const { isOnlyAdmin } = useAdminAuth();
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const submission = data?.submission;
	const subType = submission?.type;

	// Admin-only; Exhibitor entries have their own management flow.
	if (
		!submission ||
		subType === "EXHIBITOR" ||
		subType === "INVITED" ||
		!isOnlyAdmin
	) {
		return (
			<div className="flex h-full flex-col">
				<PageHeader icon={IconFileText} title="Cannot Edit" />
				<div className="flex flex-1 items-center justify-center p-6">
					<div className="text-center">
						<p className="text-muted-foreground mb-4">
							{!submission
								? "Submission not found"
								: !isOnlyAdmin
									? "Only administrators can edit submissions"
									: "Exhibitor entries are managed via the exhibitor flow"}
						</p>
						<Link params={{ id }} to="/admin/submissions/$id">
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

	const currentKeywords =
		data.versions.find((v) => v.version === submission.currentVersionNumber)
			?.keywords ?? [];

	const initialData: Partial<SubmissionFormData> = {
		type: subType,
		title: submission.title,
		content: submission.content,
		authors: data.authors.map((a) => ({
			firstName: a.firstName,
			lastName: a.lastName,
			email: a.email,
			affiliationId: null,
			affiliationName: a.affiliationName ?? "",
			isPresenter: a.isPresenter,
		})),
		keywords: currentKeywords,
		trackId: submission.trackId,
	};

	const isDraft = submission.status === "DRAFT";

	const save = async (formData: SubmissionFormData) => {
		let result: Awaited<ReturnType<typeof adminEditSubmissionFn>>;
		try {
			result = await adminEditSubmissionFn({
				data: {
					submissionId: id,
					type: formData.type,
					title: formData.title,
					content: formData.content,
					authors: formData.authors,
					keywords: formData.keywords,
					contentFormat: formData.contentFormat,
					trackId: formData.trackId,
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

		if (formData.contentFormat === "FILE" && formData.file) {
			try {
				const uploadData = new FormData();
				uploadData.append("file", formData.file);
				uploadData.append("submissionId", id);
				uploadData.append(
					"versionNumber",
					String(submission.currentVersionNumber),
				);
				const uploadResult = await adminUploadSubmissionFile({
					data: uploadData,
				});
				if (!uploadResult.success) {
					toast.error(`Saved but file upload failed: ${uploadResult.error}`);
					return false;
				}
			} catch {
				toast.error("File upload failed");
				return false;
			}
		}

		return true;
	};

	const finish = async (message: string) => {
		toast.success(message);
		await queryClient.invalidateQueries({ queryKey: ["submissions"] });
		navigate({ to: "/admin/submissions/$id", params: { id } });
	};

	const handleSubmit = async (formData: SubmissionFormData) => {
		if (!(await save(formData))) return;

		if (isDraft) {
			try {
				const result = await adminSubmitDraftFn({ data: { submissionId: id } });
				if (!result.success) {
					toast.error(result.error ?? "Submit failed");
					return;
				}
			} catch {
				toast.error("Something went wrong. Please try again.");
				return;
			}
		}

		await finish(isDraft ? "Submission submitted" : "Submission updated");
	};

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconFileText} title="Edit Submission">
				<Link params={{ id }} to="/admin/submissions/$id">
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
					hasExistingFile={!!submission.file}
					initialData={initialData}
					onSaveDraft={
						isDraft
							? async (formData: SubmissionFormData) => {
									if (await save(formData)) await finish("Draft saved");
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
