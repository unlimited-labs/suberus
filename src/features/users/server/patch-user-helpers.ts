import type { z } from "zod";
import type { userPatchInput } from "@/features/users/validations";

export type PatchUserData = z.infer<typeof userPatchInput>;

export interface FeePayment {
	feeType: string;
	amount: number;
	currency: string;
}

/**
 * Returns the fee payment payload only when a mark-fee-paid request carries all
 * required fields; otherwise null. Keeps the four-field guard out of the patch
 * orchestrator and makes it unit-testable.
 */
export function extractFeePayment(data: PatchUserData): FeePayment | null {
	if (
		data.markFeePaid &&
		data.feeType &&
		data.feeAmount !== undefined &&
		data.feeCurrency
	) {
		return {
			feeType: data.feeType,
			amount: data.feeAmount,
			currency: data.feeCurrency,
		};
	}
	return null;
}

export interface ConfiguredFeeType {
	name: string;
	amount: number;
}

/**
 * Exact name match; without one it resolves only when a single type exists —
 * guessing would record the wrong amount.
 */
export function selectFeeType(
	feeTypes: readonly ConfiguredFeeType[],
	name?: string,
): { type: ConfiguredFeeType } | { error: string } {
	if (feeTypes.length === 0) {
		return { error: "No fee types are configured" };
	}
	const names = feeTypes.map((type) => type.name).join(", ");
	if (!name) {
		return feeTypes.length === 1
			? { type: feeTypes[0] }
			: { error: `Several fee types are configured, name one: ${names}` };
	}
	const match = feeTypes.find((type) => type.name === name);
	return match
		? { type: match }
		: { error: `Unknown fee type "${name}". Configured: ${names}` };
}

/** Human-readable summary of which fields a patch touched, for the audit log. */
export function summarizeUserChanges(data: PatchUserData): string {
	return [
		data.role !== undefined && `role=${data.role}`,
		data.isActive !== undefined && `active=${data.isActive}`,
		data.allowLateSubmission !== undefined &&
			`allowLateSubmission=${data.allowLateSubmission}`,
		data.markFeePaid && "feePaid",
		data.unmarkFeePaid && "feeUnpaid",
		data.verifyEmail && "emailVerified",
	]
		.filter(Boolean)
		.join(", ");
}
