import { z } from "zod";
import { env } from "@/env";
import type { BillingColumnValues } from "@/features/settings/billing-details-rules";
import { findVatIdInText } from "@/shared/lib/vat-id";
import { generateWithLlm } from "@/shared/server/llm";

const SYSTEM_PROMPT = `You split a free-text invoice address into fields.
Answer with one line of JSON and nothing else:
{"organizationName": string, "streetAddress": string, "postalCode": string, "city": string}
Use "" for anything the text does not contain. Copy text exactly; do not invent or translate.`;

const optionalText = (max: number) =>
	z.string().trim().max(max).optional().catch(undefined);

const llmFieldsSchema = z.object({
	organizationName: optionalText(200),
	streetAddress: optionalText(200),
	postalCode: optionalText(20),
	city: optionalText(100),
});

export async function splitBillingText(
	text: string,
	countryName?: string,
): Promise<BillingColumnValues> {
	const answer = await generateWithLlm({
		system: SYSTEM_PROMPT,
		user: text,
		maxTokens: 300,
		timeoutMs: 30_000,
	});
	const json: unknown = JSON.parse(
		answer.slice(answer.indexOf("{"), answer.lastIndexOf("}") + 1),
	);
	const fields = llmFieldsSchema.parse(json);
	const result: BillingColumnValues = {
		billingOrganization: fields.organizationName,
		billingStreet: fields.streetAddress,
		billingPostalCode: fields.postalCode,
		billingCity: fields.city,
		vatId: findVatIdInText(text, countryName),
	};
	return Object.fromEntries(
		Object.entries(result).filter(([, value]) => value),
	);
}

export function isBillingTextSplitAvailable(): boolean {
	return Boolean(env.LLM_API_URL);
}
