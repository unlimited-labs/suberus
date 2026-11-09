import { logger } from "@/logger.ts";
import { guarded } from "./national-registries";
import {
	mapViesResponse,
	REGISTRY_TIMEOUT_MS,
	type RegistryResult,
	type Transport,
	UNAVAILABLE_RESULT,
	viesErrors,
	viesResponseSchema,
} from "./vies-rules";

export const VIES_URL =
	"https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number";

async function postVies(
	vatId: string,
	requesterVatId: string,
	transport: Transport,
) {
	const requester = requesterVatId
		? {
				requesterMemberStateCode: requesterVatId.slice(0, 2),
				requesterNumber: requesterVatId.slice(2),
			}
		: {};
	const response = await transport(VIES_URL, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			countryCode: vatId.slice(0, 2),
			vatNumber: vatId.slice(2),
			...requester,
		}),
		signal: AbortSignal.timeout(REGISTRY_TIMEOUT_MS),
	});
	const body: unknown = response.ok ? await response.json() : undefined;
	const parsed = viesResponseSchema.safeParse(body);
	if (!parsed.success) {
		logger.warn(
			`[vat-id] unexpected VIES answer (HTTP ${response.status}):`,
			body,
		);
		return { result: UNAVAILABLE_RESULT, errors: [] };
	}
	return {
		result: mapViesResponse(parsed.data),
		errors: viesErrors(parsed.data),
	};
}

export async function queryVies(
	vatId: string,
	requesterVatId: string,
	transport: Transport = fetch,
): Promise<RegistryResult> {
	return guarded("VIES", async () => {
		const first = await postVies(vatId, requesterVatId, transport);
		if (requesterVatId && first.errors.includes("INVALID_REQUESTER_INFO")) {
			logger.warn(
				"[vat-id] VIES rejected the Organizer's EU VAT ID; checking without a requester",
			);
			return (await postVies(vatId, "", transport)).result;
		}
		if (first.result.status === "UNAVAILABLE") {
			logger.warn(
				`[vat-id] VIES unavailable for ${vatId.slice(0, 2)}:`,
				first.errors,
			);
		}
		return first.result;
	});
}
