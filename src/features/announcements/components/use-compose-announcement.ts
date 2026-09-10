import { useSelector } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
	announcementIssuesQueryOptions,
	announcementQueryOptions,
	announcementsQueryOptions,
	cancelScheduledAnnouncementFn,
	deleteAnnouncementFn,
	type getAnnouncementById,
	publishAnnouncementFn,
	saveAnnouncementDraftFn,
} from "@/features/announcements/api/announcements";
import { announcementDraftInput } from "@/features/announcements/validations";
import { useAppForm } from "@/shared/hooks/use-app-form";
import { useDebounce } from "@/shared/hooks/use-debounce";
import { useSchedule } from "@/shared/hooks/use-schedule";
import { getErrorMessage } from "@/shared/lib/error-message";
import { extractTokens } from "@/shared/lib/placeholders";

const composeSchema = announcementDraftInput.omit({ id: true });

type Announcement = Awaited<ReturnType<typeof getAnnouncementById>>;

export function useComposeAnnouncement(announcement: Announcement) {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const isDraft = announcement.status === "DRAFT";
	const isScheduled = announcement.status === "SCHEDULED";
	const schedule = useSchedule();
	const scheduledIso = schedule.iso;

	const form = useAppForm({
		defaultValues: {
			subject: announcement.subject,
			bodySource: announcement.bodySource,
		},
		validators: { onChange: composeSchema },
	});

	const bodySource = useSelector(form.store, (s) => s.values.bodySource);
	const subject = useSelector(form.store, (s) => s.values.subject);
	const debouncedBody = useDebounce(bodySource, 400);
	const debouncedSubject = useDebounce(subject, 400);

	const tokens = extractTokens(`${debouncedSubject}
${debouncedBody}`);
	const issuesQuery = useQuery({
		...announcementIssuesQueryOptions(announcement.id, tokens),
		enabled: isDraft && tokens.length > 0,
	});
	const issues = tokens.length > 0 ? (issuesQuery.data ?? null) : null;

	const persist = () =>
		saveAnnouncementDraftFn({
			data: { id: announcement.id, ...form.state.values },
		});

	const invalidate = () =>
		queryClient.invalidateQueries({
			queryKey: announcementQueryOptions(announcement.id).queryKey,
		});

	const saveMutation = useMutation({
		mutationFn: persist,
		onSuccess: () => {
			toast.success("Draft saved");
			void invalidate();
		},
		onError: (e) => toast.error(getErrorMessage(e, "Failed to save draft")),
	});

	const publishMutation = useMutation({
		mutationFn: async () => {
			await persist();
			return publishAnnouncementFn({
				data: { id: announcement.id, scheduledAt: scheduledIso ?? undefined },
			});
		},
		onSuccess: (r) => {
			toast.success(
				scheduledIso
					? "Announcement scheduled"
					: `Published to ${r.totalRecipients} ${r.totalRecipients === 1 ? "person" : "people"}`,
			);
			void invalidate();
		},
		onError: (e) => toast.error(getErrorMessage(e, "Failed to publish")),
	});

	const cancelScheduleMutation = useMutation({
		mutationFn: () =>
			cancelScheduledAnnouncementFn({ data: { id: announcement.id } }),
		onSuccess: () => {
			schedule.setEnabled(false);
			toast.success("Schedule cancelled");
			void invalidate();
		},
		onError: (e) =>
			toast.error(getErrorMessage(e, "Failed to cancel the schedule")),
	});

	const removeMutation = useMutation({
		mutationFn: () => deleteAnnouncementFn({ data: { id: announcement.id } }),
		onSuccess: () => {
			toast.success("Draft deleted");
			void queryClient.invalidateQueries({
				queryKey: announcementsQueryOptions().queryKey,
			});
			void navigate({ to: "/admin/announcements" });
		},
		onError: (e) => toast.error(getErrorMessage(e, "Failed to delete draft")),
	});

	const formReady = useSelector(
		form.store,
		(s) =>
			s.values.subject.trim() !== "" &&
			s.values.bodySource.trim() !== "" &&
			s.isValid,
	);

	return {
		isDraft,
		isScheduled,
		schedule,
		scheduledIso,
		cancelSchedule: cancelScheduleMutation.mutate,
		isCancellingSchedule: cancelScheduleMutation.isPending,
		issues,
		form,
		bodySource,
		canPublish:
			formReady && (issues?.unknown.length ?? 0) === 0 && schedule.ready,
		save: saveMutation.mutate,
		isSaving: saveMutation.isPending,
		publish: publishMutation.mutate,
		isPublishPending: publishMutation.isPending,
		remove: removeMutation.mutate,
		isRemoving: removeMutation.isPending,
	};
}
