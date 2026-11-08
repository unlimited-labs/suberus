import { getSetting } from "@/features/settings/server/settings";
import type { VatIdCheck } from "@/generated/prisma/client";
import { logger } from "@/logger.ts";
import { isViesCheckable, normalizeVatId } from "@/shared/lib/vat-id";
import { prisma } from "@/shared/server/db.server";
import { queryVies } from "./vies";

const FRESH_MS = 24 * 60 * 60 * 1000;

function isFresh(check: VatIdCheck, now: number) {
	return (
		check.status !== "UNAVAILABLE" && now - check.checkedAt.getTime() < FRESH_MS
	);
}

/** `vatId` must already be normalized; a fresh cached result is returned without a registry call. */
export async function checkVatId(vatId: string): Promise<VatIdCheck> {
	if (!isViesCheckable(vatId)) {
		return {
			vatId,
			status: "NOT_CHECKABLE",
			source: null,
			registryName: null,
			registryAddress: null,
			requestIdentifier: null,
			checkedAt: new Date(),
		};
	}
	const cached = await prisma.vatIdCheck.findUnique({ where: { vatId } });
	if (cached && isFresh(cached, Date.now())) return cached;
	const { organizerVatId } = await getSetting("BILLING_DETAILS");
	const result = {
		source: "VIES",
		...(await queryVies(vatId, organizerVatId)),
		checkedAt: new Date(),
	};
	return prisma.vatIdCheck.upsert({
		where: { vatId },
		create: { vatId, ...result },
		update: result,
	});
}

export function checkVatIdInBackground(vatId: string | null | undefined) {
	if (!vatId) return;
	void checkVatId(vatId).catch((error) => {
		logger.warn("[vat-id] background check failed:", error);
	});
}

export async function checkTypedVatId(raw: string, countryName?: string) {
	const normalized = normalizeVatId(raw, countryName);
	if ("error" in normalized || !normalized.value) return null;
	const { status, registryName, registryAddress } = await checkVatId(
		normalized.value,
	);
	return { status, registryName, registryAddress };
}
