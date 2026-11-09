import { z } from "zod";
import type { VatIdCheckStatus } from "@/generated/prisma/enums";

export type Transport = (url: string, init: RequestInit) => Promise<Response>;

export const REGISTRY_TIMEOUT_MS = 3000;

export interface RegistryResult {
	status: VatIdCheckStatus;
	registryName: string | null;
	registryAddress: string | null;
	requestIdentifier: string | null;
}

export const viesResponseSchema = z.looseObject({
	valid: z.boolean().optional(),
	isValid: z.boolean().optional(),
	userError: z.string().optional(),
	name: z.string().optional(),
	address: z.string().optional(),
	requestIdentifier: z.string().optional(),
	errorWrappers: z.array(z.looseObject({ error: z.string() })).optional(),
});

const UNAVAILABLE_ERRORS = new Set([
	"MS_UNAVAILABLE",
	"SERVICE_UNAVAILABLE",
	"TIMEOUT",
	"GLOBAL_MAX_CONCURRENT_REQ",
	"GLOBAL_MAX_CONCURRENT_REQ_TIME",
	"MS_MAX_CONCURRENT_REQ",
	"MS_MAX_CONCURRENT_REQ_TIME",
	"INVALID_REQUESTER_INFO",
]);

export const UNAVAILABLE_RESULT: RegistryResult = {
	status: "UNAVAILABLE",
	registryName: null,
	registryAddress: null,
	requestIdentifier: null,
};

export const NOT_FOUND_RESULT: RegistryResult = {
	...UNAVAILABLE_RESULT,
	status: "NOT_FOUND",
};

const meaningful = (value: string | undefined) =>
	value && value.trim() !== "---" ? value.trim() : null;

export type ViesResponse = z.infer<typeof viesResponseSchema>;

export function viesErrors(response: ViesResponse): string[] {
	return [
		response.userError,
		...(response.errorWrappers ?? []).map((w) => w.error),
	].filter((error) => error !== undefined);
}

export function mapViesResponse(response: ViesResponse): RegistryResult {
	if (viesErrors(response).some((error) => UNAVAILABLE_ERRORS.has(error))) {
		return UNAVAILABLE_RESULT;
	}
	if (response.errorWrappers?.length) {
		return NOT_FOUND_RESULT;
	}
	const valid = response.valid ?? response.isValid;
	if (valid === undefined) return UNAVAILABLE_RESULT;
	return {
		status: valid ? "VERIFIED" : "NOT_FOUND",
		registryName: valid ? meaningful(response.name) : null,
		registryAddress: valid ? meaningful(response.address) : null,
		requestIdentifier: meaningful(response.requestIdentifier),
	};
}
