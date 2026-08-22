import { differenceInCalendarDays } from "date-fns";
import { isDeadlinePassed } from "@/shared/lib/deadline";

export interface SubmissionAccessInput {
	deadline: string | null;
	timezone: string;
	locked: boolean;
	canBypass: boolean;
	activeTypeCount: number;
	now: Date;
}

export interface SubmissionAccess {
	deadlineUrgent: boolean;
	deadlineCritical: boolean;
	canSubmit: boolean;
	disabledReason: string;
}

function resolveDisabledReason(flags: {
	canBypass: boolean;
	locked: boolean;
	deadlineOpen: boolean;
	hasActiveTypes: boolean;
}): string {
	if (!flags.canBypass && flags.locked) {
		return "Submissions have been closed by the administrator";
	}
	if (!flags.deadlineOpen) {
		return "The submission deadline has passed";
	}
	if (!flags.hasActiveTypes) {
		return "No submission types are currently active";
	}
	return "";
}

export function deriveSubmissionAccess(
	input: SubmissionAccessInput,
): SubmissionAccess {
	const { deadline, timezone, locked, canBypass, activeTypeCount, now } = input;

	const daysLeft = deadline
		? differenceInCalendarDays(new Date(deadline), now)
		: null;
	const deadlineUrgent = daysLeft !== null && daysLeft <= 7;
	const deadlineCritical = daysLeft !== null && daysLeft <= 3;
	const deadlineOpen =
		canBypass || (deadline ? !isDeadlinePassed(deadline, timezone, now) : true);
	const hasActiveTypes = activeTypeCount > 0;
	const canSubmit = (canBypass || !locked) && deadlineOpen && hasActiveTypes;

	return {
		deadlineUrgent,
		deadlineCritical,
		canSubmit,
		disabledReason: resolveDisabledReason({
			canBypass,
			locked,
			deadlineOpen,
			hasActiveTypes,
		}),
	};
}
