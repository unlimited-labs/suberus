import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
	bulkEmailCampaignQueryOptions,
	deleteBulkEmailAttachment,
	uploadBulkEmailAttachment,
} from "@/features/bulk-email/api/bulk-email";
import { MAX_ATTACHMENT_FILE_BYTES } from "@/features/bulk-email/lib/attachment-limits";
import { EMAIL_ATTACHMENT_EXTENSIONS } from "@/features/settings/file-types";
import { getErrorMessage } from "@/shared/lib/error-message";

function extensionOf(name: string): string {
	return name.split(".").pop()?.toLowerCase() ?? "";
}

function preCheck(file: File): boolean {
	const ext = extensionOf(file.name);
	if (!EMAIL_ATTACHMENT_EXTENSIONS.some((e) => e === ext)) {
		toast.error(
			`${file.name}: unsupported type. Allowed: ` +
				EMAIL_ATTACHMENT_EXTENSIONS.map((e) => e.toUpperCase()).join(", "),
		);
		return false;
	}
	if (file.size > MAX_ATTACHMENT_FILE_BYTES) {
		const maxMb = Math.round(MAX_ATTACHMENT_FILE_BYTES / (1024 * 1024));
		toast.error(`${file.name}: exceeds the ${maxMb}MB limit.`);
		return false;
	}
	return true;
}

export function useCampaignAttachments(campaignId: string) {
	const queryClient = useQueryClient();
	const [removingId, setRemovingId] = useState<string | null>(null);

	const invalidate = () =>
		queryClient.invalidateQueries({
			queryKey: bulkEmailCampaignQueryOptions(campaignId).queryKey,
		});

	const uploadMutation = useMutation({
		mutationFn: async (file: File) => {
			const formData = new FormData();
			formData.append("campaignId", campaignId);
			formData.append("file", file);
			return uploadBulkEmailAttachment({ data: formData });
		},
		onSuccess: (result, file) => {
			if (result.success) {
				toast.success(`${file.name} attached`);
			} else {
				toast.error(`${file.name}: ${result.error}`);
			}
		},
		onError: (e) =>
			toast.error(getErrorMessage(e, "Failed to upload attachment")),
		onSettled: () => invalidate(),
	});

	const removeMutation = useMutation({
		mutationFn: (fileId: string) =>
			deleteBulkEmailAttachment({ data: { fileId } }),
		onMutate: (fileId) => setRemovingId(fileId),
		onSuccess: (result) => {
			if (!result.success) toast.error(result.error ?? "Failed to remove");
		},
		onError: (e) =>
			toast.error(getErrorMessage(e, "Failed to remove attachment")),
		onSettled: () => {
			setRemovingId(null);
			return invalidate();
		},
	});

	const addFiles = async (files: File[]) => {
		for (const file of files) {
			if (preCheck(file)) await uploadMutation.mutateAsync(file);
		}
	};

	return {
		addFiles,
		remove: removeMutation.mutate,
		isUploading: uploadMutation.isPending,
		removingId,
	};
}
