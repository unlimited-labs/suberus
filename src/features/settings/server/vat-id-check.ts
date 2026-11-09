import { getSetting } from "@/features/settings/server/settings";
import type { VatIdCheck } from "@/generated/prisma/client";
import { logger } from "@/logger.ts";
import { isRegistryCheckable, normalizeVatId } from "@/shared/lib/vat-id";
import { prisma } from "@/shared/server/db.server";
import { getBoss } from "@/shared/server/queue";
import {
	queryBrreg,
	queryMfWhiteList,
	querySwissUid,
} from "./national-registries";
import { queryVies } from "./vies";

export const VAT_ID_RETRY_QUEUE = "vat-id-retry";
const FRESH_MS = 24 * 60 * 60 * 1000;

type CheckMode = "cached" | "recheck" | "retry";

/** A retry only runs after an UNAVAILABLE result, so any other stored status is newer. */
function reusable(check: VatIdCheck, mode: CheckMode, now: number) {
	if (check.status === "UNAVAILABLE") return false;
	if (mode === "retry") return true;
	return mode === "cached" && now - check.checkedAt.getTime() < FRESH_MS;
}

async function lookupRegistry(vatId: string, organizerVatId: string) {
	const prefix = vatId.slice(0, 2);
	if (prefix === "CH")
		return { source: "UID", ...(await querySwissUid(vatId)) };
	if (prefix === "NO") return { source: "BRREG", ...(await queryBrreg(vatId)) };
	const vies = await queryVies(vatId, organizerVatId);
	// A valid Polish NIP is often absent from VIES (no VAT-UE registration) yet active in the MF register.
	if (prefix === "PL" && vies.status === "NOT_FOUND") {
		const mf = await queryMfWhiteList(vatId);
		if (mf.status === "VERIFIED") return { source: "MF", ...mf };
	}
	return { source: "VIES", ...vies };
}

export interface VatIdRetryJobData {
	vatId: string;
	since: string;
}

async function scheduleRetry(vatId: string) {
	const boss = await getBoss();
	await boss.send(
		VAT_ID_RETRY_QUEUE,
		{ vatId, since: new Date().toISOString() } satisfies VatIdRetryJobData,
		{
			singletonKey: vatId,
			retryLimit: 40,
			retryDelay: 300,
			retryBackoff: true,
			retryDelayMax: 6 * 60 * 60,
		},
	);
}

type RegistryAnswer = Omit<VatIdCheck, "vatId">;

/** The latest answer per number, plus every consultation number ever returned (proof of the check). */
async function saveCheck(vatId: string, result: RegistryAnswer) {
	const upsert = prisma.vatIdCheck.upsert({
		where: { vatId },
		create: { vatId, ...result },
		update: result,
	});
	const { requestIdentifier, source } = result;
	if (!requestIdentifier || !source) return upsert;
	const [row] = await prisma.$transaction([
		upsert,
		prisma.vatIdConsultation.create({
			data: {
				vatId,
				status: result.status,
				source,
				requestIdentifier,
				checkedAt: result.checkedAt,
			},
		}),
	]);
	return row;
}

/** `vatId` must be normalized. "cached" reuses a fresh result, "retry" (the job itself) any
 * resolved one and never schedules another retry; "recheck" always asks the registry. */
export async function checkVatId(
	vatId: string,
	mode: CheckMode = "cached",
): Promise<VatIdCheck> {
	const checkable = isRegistryCheckable(vatId);
	const [config, cached] = await Promise.all([
		getSetting("BILLING_DETAILS"),
		checkable ? prisma.vatIdCheck.findUnique({ where: { vatId } }) : null,
	]);
	if (!config.registryCheck || !checkable) {
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
	if (cached && reusable(cached, mode, Date.now())) return cached;
	const result = {
		...(await lookupRegistry(vatId, config.organizerVatId)),
		checkedAt: new Date(),
	};
	const row = await saveCheck(vatId, result);
	if (row.status === "UNAVAILABLE" && mode !== "retry") {
		void scheduleRetry(vatId).catch((error) => {
			logger.warn("[vat-id] could not schedule a retry:", error);
		});
	}
	return row;
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
	const { status, source, registryName, registryAddress } = await checkVatId(
		normalized.value,
	);
	return { status, source, registryName, registryAddress };
}

/** Lookups nobody kept (anonymous blur checks, changed numbers) go after the cache window. */
export function purgeOrphanVatIdChecks(now = new Date()): Promise<number> {
	const cutoff = new Date(now.getTime() - FRESH_MS);
	return prisma.$executeRaw`
		DELETE FROM "vat_id_checks" c
		WHERE c."checkedAt" < ${cutoff}
		AND NOT EXISTS (SELECT 1 FROM "users" u WHERE u."vatId" = c."vatId")`;
}
