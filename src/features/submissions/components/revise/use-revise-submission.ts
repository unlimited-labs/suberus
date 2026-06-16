import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
	invalidateSubmissionCaches,
	resubmitSubmissionFn,
	submitConditionalRevisionFn,
	uploadSubmissionFile,
} from "@/features/submissions/api/submissions";
import { buildRevisionRequest, type RevisionFormData } from "./revise-helpers";

interface UseReviseSubmissionArgs {
	id: string;
	isConditional: boolean;
	isFileFormat: boolean;
}

/** Uploads a revised file; surfaces its own toast on failure. No-op without a file. */
async function uploadRevisionFile(
	id: string,
	versionNumber: number,
	file: File | null,
): Promise<void> {
	if (!file) return;
	try {
		const uploadData = new FormData();
		uploadData.append("file", file);
		uploadData.append("submissionId", id);
		uploadData.append("versionNumber", String(versionNumber));
		const uploadResult = await uploadSubmissionFile({ data: uploadData });
		if (!uploadResult.success) {
			toast.error(
				`Revision saved but file upload failed: ${uploadResult.error}`,
			);
		}
	} catch {
		toast.error("File upload failed");
	}
}

function notifyResubmitError(error?: string) {
	toast.error(error ?? "Resubmission failed");
}

/** Owns the resubmit / conditional-revision flow: submit, optional file upload, cache invalidation, navigation. */
export function useReviseSubmission({
	id,
	isConditional,
	isFileFormat,
}: UseReviseSubmissionArgs) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const submitFn = isConditional
		? submitConditionalRevisionFn
		: resubmitSubmissionFn;

	const submitRevision = async (formData: RevisionFormData) => {
		setIsSubmitting(true);
		try {
			const result = await submitFn({
				data: buildRevisionRequest(id, formData),
			});

			if (!result.success) {
				notifyResubmitError(result.error);
				return;
			}

			if (isFileFormat) {
				await uploadRevisionFile(id, result.versionNumber, formData.file);
			}

			toast.success("Revision submitted successfully");
			await invalidateSubmissionCaches(queryClient, id);
			navigate({ to: "/submissions/$id", params: { id } });
		} catch {
			notifyResubmitError();
		} finally {
			setIsSubmitting(false);
		}
	};

	return { isSubmitting, submitRevision };
}
