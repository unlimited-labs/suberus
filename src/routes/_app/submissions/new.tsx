import { IconFileText } from "@tabler/icons-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
	SubmissionForm,
	type SubmissionFormData,
} from "@/components/forms/submission/submission-form";
import { PageHeader } from "@/components/layout/page-header";

export const Route = createFileRoute("/_app/submissions/new")({
	component: NewSubmissionPage,
});

interface SubmissionApiError {
	error: string;
	issues?: Array<{ path: (string | number)[]; message: string }>;
}

function NewSubmissionPage() {
	const navigate = useNavigate();

	const handleSubmit = async (data: SubmissionFormData) => {
		const response = await fetch("/api/submissions", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				type: data.type,
				title: data.title,
				content: data.content,
				authors: data.authors,
				keywords: data.keywords,
			}),
		});

		if (!response.ok) {
			const error = (await response.json()) as SubmissionApiError;
			if (error.issues && error.issues.length > 0) {
				toast.error(error.issues[0].message);
			} else {
				toast.error(error.error ?? "Failed to create submission");
			}
			throw new Error(error.error ?? "Failed to create submission");
		}

		const result = (await response.json()) as { id: string; success: boolean };
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
