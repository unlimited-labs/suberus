import { useSuspenseQuery } from "@tanstack/react-query";
import {
	activeSubmissionTypesQueryOptions,
	submissionDeadlineQueryOptions,
} from "@/features/settings/api/settings";
import { deriveSubmissionAccess } from "./derive-submission-access";

export function useSubmissionAccess() {
	const {
		data: { deadline, locked, canBypass, timezone },
	} = useSuspenseQuery(submissionDeadlineQueryOptions());
	const { data: activeTypes } = useSuspenseQuery(
		activeSubmissionTypesQueryOptions(),
	);

	const access = deriveSubmissionAccess({
		deadline,
		timezone,
		locked,
		canBypass,
		activeTypeCount: activeTypes.length,
		now: new Date(),
	});

	return { deadline, ...access };
}
