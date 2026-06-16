import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
	bulkEmailCampaignQueryOptions,
	deleteBulkEmailCampaign,
	type getBulkEmailCampaign,
	previewBulkEmail,
	saveBulkEmailDraft,
	sendBulkEmailCampaign,
	sendBulkEmailTest,
} from "@/features/bulk-email/api/bulk-email";
import type { EmailCampaignFormat } from "@/generated/prisma/enums";
import { getErrorMessage } from "@/shared/lib/error-message";

type Campaign = Awaited<ReturnType<typeof getBulkEmailCampaign>>;

function useDebounced<T>(value: T, delayMs: number): T {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const t = setTimeout(() => setDebounced(value), delayMs);
		return () => clearTimeout(t);
	}, [value, delayMs]);
	return debounced;
}

export function useComposeCampaign(campaign: Campaign) {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const isDraft = campaign.status === "DRAFT";

	const [subject, setSubject] = useState(campaign.subject);
	const [format, setFormat] = useState<EmailCampaignFormat>(campaign.format);
	const [bodySource, setBodySource] = useState(campaign.bodySource);
	const [jobId, setJobId] = useState<string | null>(campaign.jobProgressId);

	const debouncedBody = useDebounced(bodySource, 400);

	const previewQuery = useQuery({
		queryKey: ["bulk-email", "preview", format, debouncedBody],
		queryFn: () =>
			previewBulkEmail({ data: { format, bodySource: debouncedBody } }),
		enabled: format !== "PLAIN",
		staleTime: Number.POSITIVE_INFINITY,
	});

	const preview =
		format === "PLAIN"
			? { body: bodySource, isHtml: false }
			: (previewQuery.data ?? { body: "", isHtml: true });

	const persist = () =>
		saveBulkEmailDraft({
			data: { id: campaign.id, subject, format, bodySource },
		});

	const saveMutation = useMutation({
		mutationFn: persist,
		onSuccess: () => toast.success("Draft saved"),
		onError: (e) => toast.error(getErrorMessage(e, "Failed to save draft")),
	});

	const testMutation = useMutation({
		mutationFn: async () => {
			await persist();
			return sendBulkEmailTest({ data: { id: campaign.id } });
		},
		onSuccess: (r) => toast.success(`Test email sent to ${r.sentTo}`),
		onError: (e) => toast.error(getErrorMessage(e, "Failed to send test")),
	});

	const sendMutation = useMutation({
		mutationFn: async () => {
			await persist();
			return sendBulkEmailCampaign({ data: { id: campaign.id } });
		},
		onSuccess: (r) => {
			setJobId(r.jobProgressId);
			toast.success("Campaign queued");
			queryClient.invalidateQueries({
				queryKey: bulkEmailCampaignQueryOptions(campaign.id).queryKey,
			});
		},
		onError: (e) => toast.error(getErrorMessage(e, "Failed to send campaign")),
	});

	const removeMutation = useMutation({
		mutationFn: () => deleteBulkEmailCampaign({ data: { id: campaign.id } }),
		onSuccess: () => {
			toast.success("Draft deleted");
			navigate({ to: "/admin/bulk-email" });
		},
		onError: (e) => toast.error(getErrorMessage(e, "Failed to delete draft")),
	});

	return {
		isDraft,
		subject,
		setSubject,
		format,
		setFormat,
		bodySource,
		setBodySource,
		preview,
		isPreviewLoading: format !== "PLAIN" && previewQuery.isFetching,
		save: saveMutation.mutate,
		isSaving: saveMutation.isPending,
		sendTest: testMutation.mutate,
		isTesting: testMutation.isPending,
		send: sendMutation.mutate,
		isSending: sendMutation.isPending,
		remove: removeMutation.mutate,
		isRemoving: removeMutation.isPending,
		jobId,
	};
}
