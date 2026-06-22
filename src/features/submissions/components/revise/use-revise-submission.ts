import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
	invalidateSubmissionCaches,
	resubmitSubmissionFn,
	submitConditionalRevisionFn,
} from "@/features/submissions/api/submissions";
import { buildRevisionRequest, type RevisionFormData } from "./revise-helpers";

interface UseReviseSubmissionArgs {
	id: string;
	isConditional: boolean;
}

function notifyResubmitError(error?: string) {
	toast.error(error ?? "Resubmission failed");
}

/** Builds the revision multipart payload (JSON fields + the new file). */
function buildRevisionFormData(
	id: string,
	formData: RevisionFormData,
): FormData {
	const req = buildRevisionRequest(id, formData);
	const fd = new FormData();
	fd.append("submissionId", req.submissionId);
	fd.append("title", req.title);
	fd.append("content", req.content);
	if (req.comment) fd.append("comment", req.comment);
	fd.append("authors", JSON.stringify(req.authors));
	fd.append("keywords", JSON.stringify(req.keywords));
	if (formData.file) fd.append("file", formData.file);
	return fd;
}

/** Owns the resubmit / conditional-revision flow: submit (file travels with it), cache invalidation, navigation. */
export function useReviseSubmission({
	id,
	isConditional,
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
				data: buildRevisionFormData(id, formData),
			});

			if (!result.success) {
				notifyResubmitError(result.error);
				return;
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
