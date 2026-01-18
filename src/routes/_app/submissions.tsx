import { createFileRoute } from "@tanstack/react-router"
import { IconFileText } from "@tabler/icons-react"
import { PageHeader } from "@/components/layout/page-header"
import {
	SubmissionForm,
	type SubmissionFormData,
} from "@/components/forms/submission/submission-form"

export const Route = createFileRoute("/_app/submissions")({
	component: SubmissionsPage,
})

function SubmissionsPage() {
	const handleSubmit = async (data: SubmissionFormData) => {
		console.log("Submission data:", data)
		// TODO: Implement API call to save submission
		await new Promise((resolve) => setTimeout(resolve, 1000))
	}

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconFileText} title="Submissions" />
			<div className="flex-1 p-6 overflow-auto">
				<SubmissionForm onSubmit={handleSubmit} />
			</div>
		</div>
	)
}
