import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
	bulkEmailCampaignQueryOptions,
	bulkEmailCampaignsQueryOptions,
	deleteBulkEmailCampaign,
	duplicateBulkEmailCampaign,
	type getBulkEmailCampaign,
	previewBulkEmail,
	saveBulkEmailDraft,
	sendBulkEmailCampaign,
	sendBulkEmailTest,
} from "@/features/bulk-email/api/bulk-email";
import type { EmailCampaignFormat } from "@/generated/prisma/enums";
import { useJobSSE } from "@/shared/hooks/use-job-sse";
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

	const copyMutation = useMutation({
		mutationFn: () => duplicateBulkEmailCampaign({ data: { id: campaign.id } }),
		onSuccess: (r) => {
			toast.success("Copied to a new draft");
			queryClient.invalidateQueries({
				queryKey: bulkEmailCampaignsQueryOptions().queryKey,
			});
			navigate({
				to: "/admin/bulk-email/$id",
				params: { id: r.campaignId },
			});
		},
		onError: (e) => toast.error(getErrorMessage(e, "Failed to copy campaign")),
	});

	// Live send progress. The worker advances campaign.status (SENDING → final)
	// and the per-recipient counts server-side; refetch the campaign on every
	// progress tick (status change OR a new processed count) so the header badge,
	// the sent/failed totals and each recipient's SENT/FAILED mark update live
	// alongside the progress bar instead of freezing at the send-time snapshot.
	const job = useJobSSE(jobId);
	const lastSyncedCurrent = useRef(-1);
	useEffect(() => {
		if (!jobId) return;
		const terminal = job.status === "done" || job.status === "error";
		if (job.status !== "running" && !terminal) return;
		// Sync once per processed-count tick (and always on the terminal event).
		if (job.current === lastSyncedCurrent.current && !terminal) return;
		lastSyncedCurrent.current = job.current;
		void queryClient.invalidateQueries({
			queryKey: bulkEmailCampaignQueryOptions(campaign.id).queryKey,
		});
	}, [job.status, job.current, jobId, campaign.id, queryClient]);

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
		copy: copyMutation.mutate,
		isCopying: copyMutation.isPending,
		jobId,
		job,
	};
}
