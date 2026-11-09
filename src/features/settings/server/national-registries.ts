import { z } from "zod";
import { logger } from "@/logger.ts";
import { todayInZone } from "@/shared/lib/zoned";
import {
	REGISTRY_TIMEOUT_MS,
	type RegistryResult,
	type Transport,
	UNAVAILABLE_RESULT,
} from "./vies-rules";

const NOT_FOUND_RESULT: RegistryResult = {
	...UNAVAILABLE_RESULT,
	status: "NOT_FOUND",
};

const verified = (
	registryName: string | null = null,
	registryAddress: string | null = null,
	requestIdentifier: string | null = null,
): RegistryResult => ({
	status: "VERIFIED",
	registryName,
	registryAddress,
	requestIdentifier,
});

export async function guarded(
	registry: string,
	call: () => Promise<RegistryResult>,
): Promise<RegistryResult> {
	try {
		return await call();
	} catch (error) {
		logger.warn(`[vat-id] ${registry} lookup failed:`, error);
		return UNAVAILABLE_RESULT;
	}
}

// C = active VAT payer, Z = VAT-exempt payer: both are in the register.
const MF_REGISTERED_STATUSES = new Set(["C", "Z"]);

const mfStatusSchema = z.object({
	result: z.object({
		subject: z.object({
			statusCode: z.string(),
			requestId: z.string().nullish(),
		}),
	}),
});

/** Status endpoint only (50k/day); MF bank accounts and representatives are never read. */
export function queryMfWhiteList(
	vatId: string,
	transport: Transport = fetch,
): Promise<RegistryResult> {
	return guarded("MF white list", async () => {
		const date = todayInZone("Europe/Warsaw");
		const response = await transport(
			`https://wl-api.mf.gov.pl/api2/status/nip/${vatId.slice(2)}?date=${date}`,
			{ signal: AbortSignal.timeout(REGISTRY_TIMEOUT_MS) },
		);
		const parsed = mfStatusSchema.safeParse(
			response.ok ? await response.json() : undefined,
		);
		if (!parsed.success) return UNAVAILABLE_RESULT;
		const { statusCode, requestId } = parsed.data.result.subject;
		return MF_REGISTERED_STATUSES.has(statusCode)
			? verified(null, null, requestId ?? null)
			: NOT_FOUND_RESULT;
	});
}

const SWISS_ENDPOINT = "https://www.uid-wse.admin.ch/V5.0/PublicServices.svc";

export function querySwissUid(
	vatId: string,
	transport: Transport = fetch,
): Promise<RegistryResult> {
	return guarded("CH UID", async () => {
		const response = await transport(SWISS_ENDPOINT, {
			method: "POST",
			headers: {
				"Content-Type": "text/xml; charset=utf-8",
				SOAPAction:
					'"http://www.uid.admin.ch/xmlns/uid-wse/IPublicServices/ValidateVatNumber"',
			},
			body: `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:uid="http://www.uid.admin.ch/xmlns/uid-wse"><soapenv:Body><uid:ValidateVatNumber><uid:vatNumber>${vatId}</uid:vatNumber></uid:ValidateVatNumber></soapenv:Body></soapenv:Envelope>`,
			signal: AbortSignal.timeout(REGISTRY_TIMEOUT_MS),
		});
		const answer = /<ValidateVatNumberResult>(true|false)</.exec(
			await response.text(),
		)?.[1];
		if (!response.ok || answer === undefined) return UNAVAILABLE_RESULT;
		return answer === "true" ? verified() : NOT_FOUND_RESULT;
	});
}

const brregUnitSchema = z.object({
	navn: z.string(),
	registrertIMvaregisteret: z.boolean(),
	forretningsadresse: z
		.object({
			adresse: z.array(z.string()).optional(),
			postnummer: z.string().optional(),
			poststed: z.string().optional(),
		})
		.optional(),
});

function brregResult(unit: z.infer<typeof brregUnitSchema>): RegistryResult {
	if (!unit.registrertIMvaregisteret) return NOT_FOUND_RESULT;
	const address = unit.forretningsadresse;
	const lines = [
		...(address?.adresse ?? []),
		[address?.postnummer, address?.poststed].filter(Boolean).join(" "),
	].filter(Boolean);
	return verified(unit.navn, lines.join("\n") || null);
}

export function queryBrreg(
	vatId: string,
	transport: Transport = fetch,
): Promise<RegistryResult> {
	return guarded("NO Brreg", async () => {
		const response = await transport(
			`https://data.brreg.no/enhetsregisteret/api/enheter/${vatId.slice(2)}`,
			{ signal: AbortSignal.timeout(REGISTRY_TIMEOUT_MS) },
		);
		if (response.status === 404 || response.status === 410) {
			return NOT_FOUND_RESULT;
		}
		const parsed = brregUnitSchema.safeParse(
			response.ok ? await response.json() : undefined,
		);
		return parsed.success ? brregResult(parsed.data) : UNAVAILABLE_RESULT;
	});
}
