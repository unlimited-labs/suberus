import { IconFileText } from "@tabler/icons-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
	SubmissionForm,
	type SubmissionFormData,
} from "@/components/forms/submission/submission-form";
import { PageHeader } from "@/components/layout/page-header";
import { createSubmission } from "@/utils/submissions.functions";

export const Route = createFileRoute("/_app/submissions/new")({
	component: NewSubmissionPage,
});

function NewSubmissionPage() {
	const navigate = useNavigate();

	const handleSubmit = async (data: SubmissionFormData) => {
		const result = await createSubmission({
			data: {
				type: data.type,
				title: data.title,
				content: data.content,
				authors: data.authors,
				keywords: data.keywords,
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

		toast.success("Submission created successfully");
		navigate({ to: "/submissions/$id", params: { id: result.id } });
	};

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconFileText} title="New Submission" />
			<div className="flex-1 p-6 overflow-auto">
				<SubmissionForm onSubmit={handleSubmit} />
			</div>
		</div>
	);
}
