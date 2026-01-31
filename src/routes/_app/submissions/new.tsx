import { IconFileText } from "@tabler/icons-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
	SubmissionForm,
	type SubmissionFormData,
} from "@/components/forms/submission/submission-form";
import { PageHeader } from "@/components/layout/page-header";
import {
	getActiveSubmissionTypesFn,
	getSubmissionValidationForFormFn,
} from "@/utils/settings.functions";
import {
	createSubmission,
	uploadSubmissionFile,
} from "@/utils/submissions.functions";

export const Route = createFileRoute("/_app/submissions/new")({
	loader: async () => {
		const [typeConfigs, validationSettings] = await Promise.all([
			getActiveSubmissionTypesFn(),
			getSubmissionValidationForFormFn(),
		]);
		return { typeConfigs, validationSettings };
	},
	component: NewSubmissionPage,
});

function NewSubmissionPage() {
	const { typeConfigs, validationSettings } = Route.useLoaderData();
	const navigate = useNavigate();

	const handleSubmit = async (data: SubmissionFormData) => {
		// Create submission first
		const result = await createSubmission({
			data: {
				type: data.type,
				title: data.title,
				content: data.content,
				authors: data.authors,
				keywords: data.keywords,
				contentFormat: data.contentFormat,
			},
		});

		if (!result.success) {
			if (result.issues && result.issues.length > 0) {
				toast.error(result.issues[0].message);
			} else {
				toast.error(result.error);
			}
			return;
		}

		// If FILE format with file, upload it
		if (data.contentFormat === "FILE" && data.file) {
			try {
				// Convert file to base64
				const buffer = await data.file.arrayBuffer();
				const base64 = btoa(
					new Uint8Array(buffer).reduce(
						(data, byte) => data + String.fromCharCode(byte),
						"",
					),
				);

				const uploadResult = await uploadSubmissionFile({
					data: {
						submissionId: result.id,
						versionNumber: 1,
						fileName: data.file.name,
						mimeType: data.file.type,
						fileBase64: base64,
					},
				});

				if (!uploadResult.success) {
					toast.error(`Submission created but file upload failed: ${uploadResult.error}`);
					// Still navigate - submission exists
				}
			} catch {
				toast.error("File upload failed");
				// Still navigate - submission exists
			}
		}

		toast.success("Submission created successfully");
		navigate({ to: "/submissions/$id", params: { id: result.id } });
	};

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconFileText} title="New Submission" />
			<div className="flex-1 p-6 overflow-auto">
				<SubmissionForm
					onSubmit={handleSubmit}
					typeConfigs={typeConfigs}
					validationSettings={validationSettings}
				/>
			</div>
		</div>
	);
}
