import { toast } from "sonner";
import type { SubmissionResult } from "@/features/submissions/api/submissions";
import {
	extractZodIssueMessage,
	logClientError,
} from "@/shared/lib/log-client-error";
import type { SubmissionFormData } from "./submission-form-types";

function getCreateSubmissionErrorMessage(cause: unknown): string {
	if (cause instanceof Error && cause.message === "Request timed out") {
		return "Submission took too long. Check your submissions list before retrying — it may have gone through.";
	}
	return (
		extractZodIssueMessage(cause) ?? "Something went wrong. Please try again."
	);
}

function submissionResultErrorMessage(result: {
	error?: string;
	issues?: { message: string }[];
}): string {
	if (result.issues && result.issues.length > 0)
		return result.issues[0].message;
	return result.error ?? "";
}

// File (for FILE types) travels with the create call so it is validated +
// attached atomically server-side. targetUserId only for admin on-behalf.
export function buildCreateSubmissionFormData(
	data: SubmissionFormData,
	isDraft: boolean,
	targetUserId?: string,
): FormData {
	const formData = new FormData();
	formData.append("type", data.type);
	formData.append("title", data.title);
	formData.append("content", data.content);
	formData.append("authors", JSON.stringify(data.authors));
	formData.append("keywords", JSON.stringify(data.keywords));
	formData.append("contentFormat", data.contentFormat);
	if (data.trackId) formData.append("trackId", data.trackId);
	formData.append("isDraft", String(isDraft));
	if (data.contentFormat === "FILE" && data.file) {
		formData.append("file", data.file);
	}
	if (targetUserId) formData.append("targetUserId", targetUserId);
	return formData;
}

export async function runCreateSubmission(
	formData: FormData,
	submit: (formData: FormData) => Promise<SubmissionResult>,
): Promise<{ id: string } | null> {
	let result: SubmissionResult;
	try {
		result = await Promise.race([
			submit(formData),
			new Promise<never>((_, reject) =>
				setTimeout(() => reject(new Error("Request timed out")), 60_000),
			),
		]);
	} catch (e) {
		await logClientError("[submission] createSubmission failed", e);
		toast.error(getCreateSubmissionErrorMessage(e));
		return null;
	}

	if (!result.success) {
		toast.error(submissionResultErrorMessage(result));
		return null;
	}
	return { id: result.id };
}
