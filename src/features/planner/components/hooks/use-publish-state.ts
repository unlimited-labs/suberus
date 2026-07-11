import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
	publishScheduleDraftFn,
	publishScheduleFn,
	scheduleIssuesQueryOptions,
	scheduleStateQueryOptions,
	unpublishScheduleFn,
} from "@/features/planner/api/schedule";
import { getErrorMessage } from "@/shared/lib/error-message";
import { useInvalidatePlannerQueries } from "./use-invalidate-planner-queries";

export type PublishMode = "draft" | "public";

/**
 * Owns publish-flow state: dialog open state, the in-flight action, the
 * lazily-loaded schedule issues and the publish/unpublish handlers. Leaves the
 * button and dialog as presentation.
 */
export function usePublishState() {
	const invalidate = useInvalidatePlannerQueries();
	const { data: state } = useSuspenseQuery(scheduleStateQueryOptions());
	const [dialogOpen, setDialogOpen] = useState(false);
	const [busy, setBusy] = useState<PublishMode | "unpublish" | null>(null);

	const { data: issues, isLoading: issuesLoading } = useQuery({
		...scheduleIssuesQueryOptions(),
		enabled: dialogOpen,
	});

	const status = state.status;

	const publish = async (mode: PublishMode) => {
		setBusy(mode);
		try {
			if (mode === "public") {
				await publishScheduleFn();
				toast.success("Program published");
			} else {
				await publishScheduleDraftFn();
				toast.success("Draft shared with admins");
			}
			invalidate();
			setDialogOpen(false);
		} catch (e) {
			toast.error(getErrorMessage(e, "Failed to publish"));
		}
		setBusy(null);
	};

	const unpublish = async () => {
		setBusy("unpublish");
		try {
			await unpublishScheduleFn();
			invalidate();
			toast.success("Program unpublished");
		} catch (e) {
			toast.error(getErrorMessage(e, "Failed to unpublish"));
		}
		setBusy(null);
	};

	return {
		isPublished: status === "PUBLISHED",
		isDraftPublished: status === "DRAFT_PUBLISHED",
		dialogOpen,
		setDialogOpen,
		busy,
		issues,
		issuesLoading,
		publish,
		unpublish,
	};
}
