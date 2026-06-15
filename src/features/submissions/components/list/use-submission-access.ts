import { useSuspenseQuery } from "@tanstack/react-query";
import { differenceInCalendarDays, isAfter } from "date-fns";
import {
	activeSubmissionTypesQueryOptions,
	submissionDeadlineQueryOptions,
} from "@/features/settings/api/settings";

/**
 * Derives submission-window access from the deadline and active-type settings:
 * whether the author can submit, the reason when they can't, and deadline urgency.
 */
export function useSubmissionAccess() {
	const {
		data: { deadline, locked, canBypass },
	} = useSuspenseQuery(submissionDeadlineQueryOptions());
	const { data: activeTypes } = useSuspenseQuery(
		activeSubmissionTypesQueryOptions(),
	);

	const daysLeft = deadline
		? differenceInCalendarDays(new Date(deadline), new Date())
		: null;
	const deadlineUrgent = daysLeft !== null && daysLeft <= 7;
	const deadlineCritical = daysLeft !== null && daysLeft <= 3;
	const deadlineOpen =
		canBypass || (deadline ? isAfter(new Date(deadline), new Date()) : true);
	const hasActiveTypes = activeTypes.length > 0;
	const canSubmit = (canBypass || !locked) && deadlineOpen && hasActiveTypes;

	const disabledReason =
		!canBypass && locked
			? "Submissions have been closed by the administrator"
			: !deadlineOpen
				? "The submission deadline has passed"
				: !hasActiveTypes
					? "No submission types are currently active"
					: "";

	return {
		deadline,
		deadlineUrgent,
		deadlineCritical,
		canSubmit,
		disabledReason,
	};
}
