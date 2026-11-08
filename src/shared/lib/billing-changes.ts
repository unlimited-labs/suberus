export const BILLING_AUDIT_FIELDS = [
	"needInvoice",
	"billingText",
	"billingOrganization",
	"billingStreet",
	"billingPostalCode",
	"billingCity",
	"vatId",
	"country",
] as const;

export type BillingAuditField = (typeof BILLING_AUDIT_FIELDS)[number];
type BillingAuditValue = string | boolean | null;
export type BillingAuditValues = Partial<
	Record<BillingAuditField, BillingAuditValue>
>;
export type BillingChanges = Partial<
	Record<BillingAuditField, { from: BillingAuditValue; to: BillingAuditValue }>
>;

function auditValue(value: BillingAuditValue | undefined): BillingAuditValue {
	return value === "" || value === undefined ? null : value;
}

export function billingChanges(
	before: BillingAuditValues,
	after: BillingAuditValues,
): BillingChanges | null {
	const changes: BillingChanges = {};
	for (const field of BILLING_AUDIT_FIELDS) {
		const from = auditValue(before[field]);
		const to = auditValue(after[field]);
		if (from !== to) changes[field] = { from, to };
	}
	return Object.keys(changes).length > 0 ? changes : null;
}

/** Oldest first; one before→after diff across all of them. */
export function mergeBillingChanges(list: BillingChanges[]): BillingChanges {
	const merged: BillingChanges = {};
	for (const changes of list) {
		for (const field of BILLING_AUDIT_FIELDS) {
			const change = changes[field];
			if (!change) continue;
			const first = merged[field] ?? change;
			merged[field] = { from: first.from, to: change.to };
		}
	}
	return Object.fromEntries(
		Object.entries(merged).filter(([, change]) => change.from !== change.to),
	);
}
