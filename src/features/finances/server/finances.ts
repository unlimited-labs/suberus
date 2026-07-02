import { evalAmount } from "@/features/finances/calc";
import type { SaveFinancesInput } from "@/features/finances/validations";
import { getSetting, setSetting } from "@/features/settings/server/settings";
import type { FinanceEntryKind } from "@/generated/prisma/enums";
import { prisma } from "@/shared/server/db.server";

export interface FinanceEntryDto {
	id: string;
	kind: FinanceEntryKind;
	label: string;
	amount: number;
	amountExpr: string;
	contractor: string | null;
	vatRate: number | null;
	amountIsGross: boolean;
	dueDate: string;
	paid: boolean;
	ordered: boolean;
}

export interface FeeTypeSummary {
	id: string;
	name: string;
	amount: number;
	paidCount: number;
}

export interface FeeSummary {
	collectedTotal: number;
	currency: string;
	types: FeeTypeSummary[];
}

export async function listFinanceEntries(): Promise<FinanceEntryDto[]> {
	const rows = await prisma.financeEntry.findMany({
		orderBy: [{ kind: "asc" }, { sortOrder: "asc" }],
	});
	return rows.map((row) => ({
		id: row.id,
		kind: row.kind,
		label: row.label,
		amount: Number(row.amount),
		amountExpr: row.amountExpr ?? String(Number(row.amount)),
		contractor: row.contractor,
		vatRate: row.vatRate,
		amountIsGross: row.amountIsGross,
		dueDate: row.dueDate ? row.dueDate.toISOString().slice(0, 10) : "",
		paid: row.paid,
		ordered: row.ordered,
	}));
}

export function getVatRates() {
	return getSetting("FINANCES_VAT_RATES");
}

export async function getContractorSuggestions(): Promise<string[]> {
	const [rows, saved] = await Promise.all([
		prisma.financeEntry.findMany({
			where: { contractor: { not: null } },
			select: { contractor: true },
			distinct: ["contractor"],
		}),
		getSetting("FINANCES_CONTRACTORS"),
	]);
	const names = new Set<string>(saved);
	for (const row of rows) {
		if (row.contractor) names.add(row.contractor);
	}
	return [...names].sort((a, b) => a.localeCompare(b));
}

export async function addContractor(name: string): Promise<string[]> {
	const trimmed = name.trim();
	const saved = await getSetting("FINANCES_CONTRACTORS");
	if (
		trimmed &&
		!saved.some((c) => c.toLowerCase() === trimmed.toLowerCase())
	) {
		await setSetting("FINANCES_CONTRACTORS", [...saved, trimmed]);
	}
	return getContractorSuggestions();
}

export async function getFeeSummary(): Promise<FeeSummary> {
	const [grouped, feeTypes, currency] = await Promise.all([
		prisma.fee.groupBy({
			by: ["type"],
			where: { paid: true },
			_sum: { amount: true },
			_count: true,
		}),
		getSetting("FEE_TYPES"),
		getSetting("FEE_CURRENCY"),
	]);

	const collectedTotal = grouped.reduce(
		(sum, group) => sum + (group._sum.amount ? Number(group._sum.amount) : 0),
		0,
	);
	const countByType = new Map(
		grouped.map((group) => [group.type, group._count]),
	);

	const types = feeTypes.map((type) => ({
		id: type.id,
		name: type.name,
		amount: type.amount,
		paidCount: countByType.get(type.id) ?? countByType.get(type.name) ?? 0,
	}));

	return { collectedTotal, currency, types };
}

export async function saveFinanceEntries(
	input: SaveFinancesInput,
): Promise<void> {
	const rows = [
		...input.expenses.map((row, index) => ({
			kind: "EXPENSE" as const,
			label: row.label,
			amount: evalAmount(row.amountExpr),
			amountExpr: row.amountExpr,
			contractor: row.contractor?.trim() ? row.contractor.trim() : null,
			vatRate: row.vatRate ?? null,
			amountIsGross: row.amountIsGross ?? true,
			dueDate: row.dueDate ? new Date(row.dueDate) : null,
			paid: row.paid ?? false,
			ordered: row.ordered ?? false,
			sortOrder: index,
		})),
		...input.income.map((row, index) => ({
			kind: "INCOME" as const,
			label: row.label,
			amount: evalAmount(row.amountExpr),
			amountExpr: row.amountExpr,
			contractor: null,
			vatRate: null,
			amountIsGross: true,
			dueDate: null,
			paid: false,
			ordered: false,
			sortOrder: index,
		})),
	];

	await prisma.$transaction([
		prisma.financeEntry.deleteMany({}),
		prisma.financeEntry.createMany({ data: rows }),
	]);
}
