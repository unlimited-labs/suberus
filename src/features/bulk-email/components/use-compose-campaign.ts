import { useSelector } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
	bulkEmailCampaignQueryOptions,
	bulkEmailCampaignsQueryOptions,
	cancelScheduledBulkEmail,
	deleteBulkEmailCampaign,
	duplicateBulkEmailCampaign,
	type getBulkEmailCampaign,
	bulkEmailPlaceholderIssuesQueryOptions,
	bulkEmailPreviewQueryOptions,
	saveBulkEmailDraft,
	sendBulkEmailCampaign,
	sendBulkEmailTest,
} from "@/features/bulk-email/api/bulk-email";
import { hasLiveJob } from "@/features/bulk-email/server/bulk-email-status";
import { campaignDraftInput } from "@/features/bulk-email/validations";
import { useAppForm } from "@/shared/hooks/use-app-form";
import { useDebounce } from "@/shared/hooks/use-debounce";
import { useJobSSE } from "@/shared/hooks/use-job-sse";
import { useSchedule } from "@/shared/hooks/use-schedule";
import { getErrorMessage } from "@/shared/lib/error-message";
import { extractTokens } from "@/shared/lib/placeholders";

const composeSchema = campaignDraftInput
	.omit({ id: true })
	.required({ replyTo: true, saveToProfile: true });

type Campaign = Awaited<ReturnType<typeof getBulkEmailCampaign>>;

export function useComposeCampaign(campaign: Campaign) {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const isDraft = campaign.status === "DRAFT";
	const isScheduled = campaign.status === "SCHEDULED";

	const form = useAppForm({
		defaultValues: {
			subject: campaign.subject,
			format: campaign.format,
			bodySource: campaign.bodySource,
			replyTo: campaign.replyTo ?? "",
			saveToProfile: campaign.saveToProfile,
		},
		validators: { onChange: composeSchema },
	});

	const [jobId, setJobId] = useState<string | null>(
		hasLiveJob(campaign.status) ? campaign.jobProgressId : null,
	);
	const schedule = useSchedule();
	const scheduledIso = schedule.iso;

	const format = useSelector(form.store, (s) => s.values.format);
	const bodySource = useSelector(form.store, (s) => s.values.bodySource);
	const subject = useSelector(form.store, (s) => s.values.subject);
	const debouncedBody = useDebounce(bodySource, 400);
	const debouncedSubject = useDebounce(subject, 400);

	const tokens = extractTokens(`${debouncedSubject}
${debouncedBody}`);
	const issuesQuery = useQuery({
		...bulkEmailPlaceholderIssuesQueryOptions(campaign.id, tokens),
		enabled: isDraft && tokens.length > 0,
	});
	const issues = tokens.length > 0 ? (issuesQuery.data ?? null) : null;

	const previewQuery = useQuery({
		...bulkEmailPreviewQueryOptions(format, debouncedBody),
		enabled: format !== "PLAIN",
	});

	const preview =
		format === "PLAIN"
			? { body: bodySource, isHtml: false }
			: (previewQuery.data ?? { body: "", isHtml: true });

	const persist = () =>
		saveBulkEmailDraft({
			data: { id: campaign.id, ...form.state.values },
		});

	const saveMutation = useMutation({
		mutationFn: persist,
		onSuccess: () => {
			toast.success("Draft saved");
			queryClient.invalidateQueries({
				queryKey: bulkEmailCampaignQueryOptions(campaign.id).queryKey,
			});
		},
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
			return sendBulkEmailCampaign({
				data: { id: campaign.id, scheduledAt: scheduledIso ?? undefined },
			});
		},
		onSuccess: (r) => {
			setJobId(scheduledIso ? null : r.jobProgressId);
			toast.success(scheduledIso ? "Campaign scheduled" : "Campaign queued");
			queryClient.invalidateQueries({
				queryKey: bulkEmailCampaignQueryOptions(campaign.id).queryKey,
			});
		},
		onError: (e) => toast.error(getErrorMessage(e, "Failed to send campaign")),
	});

	const cancelScheduleMutation = useMutation({
		mutationFn: () => cancelScheduledBulkEmail({ data: { id: campaign.id } }),
		onSuccess: () => {
			schedule.setEnabled(false);
			toast.success("Schedule cancelled");
			queryClient.invalidateQueries({
				queryKey: bulkEmailCampaignQueryOptions(campaign.id).queryKey,
			});
		},
		onError: (e) =>
			toast.error(getErrorMessage(e, "Failed to cancel the schedule")),
	});

	const removeMutation = useMutation({
		mutationFn: () => deleteBulkEmailCampaign({ data: { id: campaign.id } }),
		onSuccess: () => {
			toast.success("Draft deleted");
			queryClient.invalidateQueries({
				queryKey: bulkEmailCampaignsQueryOptions().queryKey,
			});
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

	const job = useJobSSE(jobId);
	const lastSyncedCurrent = useRef(-1);
	const { status: jobStatus, current: jobCurrent } = job;
	useEffect(() => {
		if (!jobId) return;
		const terminal = jobStatus === "done" || jobStatus === "error";
		if (jobStatus !== "running" && !terminal) return;
		if (jobCurrent === lastSyncedCurrent.current && !terminal) return;
		lastSyncedCurrent.current = jobCurrent;
		void queryClient.invalidateQueries({
			queryKey: bulkEmailCampaignQueryOptions(campaign.id).queryKey,
		});
	}, [jobStatus, jobCurrent, jobId, campaign.id, queryClient]);

	const hasUnknownTokens = (issues?.unknown.length ?? 0) > 0;
	const formReady = useSelector(
		form.store,
		(s) =>
			s.values.subject.trim() !== "" &&
			s.values.bodySource.trim() !== "" &&
			s.isValid,
	);
	const canSend = formReady && !hasUnknownTokens && schedule.ready;

	return {
		isDraft,
		isScheduled,
		canSend,
		schedule,
		scheduledIso,
		cancelSchedule: cancelScheduleMutation.mutate,
		isCancellingSchedule: cancelScheduleMutation.isPending,
		issues,
		form,
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
