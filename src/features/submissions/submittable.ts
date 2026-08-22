import type { SubmissionType } from "@/generated/prisma/enums";

export type NonSubmittableType = "EXHIBITOR" | "INVITED";
export type SubmittableType = Exclude<SubmissionType, NonSubmittableType>;

/** EXHIBITOR and INVITED are placeholders, not author submissions: an exhibitor
 * entry is decided through the exhibitor flow and an invited talk just backs a
 * programme slot. Neither has a draft to submit, a review to assign, a decision
 * to take, or an edit form. */
export const NON_SUBMITTABLE_TYPES: NonSubmittableType[] = [
	"EXHIBITOR",
	"INVITED",
];

export function isNonSubmittable(
	type: SubmissionType,
): type is NonSubmittableType {
	return NON_SUBMITTABLE_TYPES.some((t) => t === type);
}
