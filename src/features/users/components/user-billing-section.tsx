import { IconRefresh } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { billingDetailsConfigQueryOptions } from "@/features/settings/api/settings";
import {
	activeBillingFields,
	BILLING_TEXT_NAME,
	type BillingDetailsSettings,
} from "@/features/settings/billing-details-schema";
import { invoiceStateLabels, vatIdStatusLabels } from "@/features/users/labels";
import type { AdminUserDetail } from "@/features/users/server/users";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { useRecheckVatId } from "./use-recheck-vat-id";
import { VatIdStatusIcon } from "./user-invoice-cells";

function BillingRow({
	label,
	value,
	note,
}: {
	label: string;
	value: string | null;
	note?: string | null;
}) {
	return (
		<div className="grid gap-0.5 sm:grid-cols-3 sm:gap-3">
			<dt className="text-muted-foreground text-sm">{label}</dt>
			<dd className="text-sm whitespace-pre-line sm:col-span-2">
				{value || "—"}
				{note && (
					<span className="text-muted-foreground block text-xs">{note}</span>
				)}
			</dd>
		</div>
	);
}

function activeRows(user: AdminUserDetail, config: BillingDetailsSettings) {
	const registryNote = user.vatIdCheck?.registryName
		? `Registry: ${user.vatIdCheck.registryName}`
		: null;
	const textRow =
		config.mode === "FREE_TEXT"
			? [
					{
						key: "billingText",
						label: config.text.label || BILLING_TEXT_NAME,
						value: user.billingText,
						note: registryNote,
					},
				]
			: [];
	const fieldRows = activeBillingFields(config)
		.filter((f) => f.key !== "vatId")
		.map((f) => ({
			key: f.key,
			label: config.fields[f.key].label || f.name,
			value: user[f.column],
			note: f.key === "organizationName" ? registryNote : null,
		}));
	return [...textRow, ...fieldRows];
}

function VatIdRow({
	user,
	label,
	showRegistry,
}: {
	user: AdminUserDetail;
	label: string;
	showRegistry: boolean;
}) {
	const { formatDateTime } = useDateFormat();
	const recheck = useRecheckVatId(user.id);
	const check = user.vatIdCheck;
	const registry =
		showRegistry && check?.registryName
			? ` · Registry: ${check.registryName}`
			: "";

	return (
		<div className="grid gap-0.5 sm:grid-cols-3 sm:gap-3">
			<dt className="text-muted-foreground text-sm">{label}</dt>
			<dd className="space-y-1 text-sm sm:col-span-2">
				<span className="flex flex-wrap items-center gap-2">
					{user.vatId ?? "—"}
					{check && (
						<Badge className="gap-1" variant="outline">
							<VatIdStatusIcon check={check} />
							{vatIdStatusLabels[check.status]}
						</Badge>
					)}
					{user.vatId && (
						<Button
							disabled={recheck.isPending}
							onClick={() => recheck.mutate()}
							size="sm"
							type="button"
							variant="ghost"
						>
							<IconRefresh className="size-4" />
							Re-check
						</Button>
					)}
				</span>
				{check && (
					<span className="text-muted-foreground block text-xs">
						Checked {formatDateTime(check.checkedAt)}
						{registry}
					</span>
				)}
			</dd>
		</div>
	);
}

export function UserBillingSection({ user }: { user: AdminUserDetail }) {
	const { data: config } = useSuspenseQuery(billingDetailsConfigQueryOptions());
	const rows = activeRows(user, config);
	const registryOnVatRow = !rows.some((row) => row.note);

	return (
		<dl className="space-y-3" data-testid="user-billing-section">
			<BillingRow
				label="Invoice"
				value={
					user.invoiceState === "NONE"
						? "Not needed"
						: invoiceStateLabels[user.invoiceState]
				}
			/>
			{rows.map((row) => (
				<BillingRow
					key={row.key}
					label={row.label}
					note={row.note}
					value={row.value}
				/>
			))}
			{config.fields.vatId.state !== "OFF" && (
				<VatIdRow
					label={config.fields.vatId.label || "VAT ID"}
					showRegistry={registryOnVatRow}
					user={user}
				/>
			)}
		</dl>
	);
}
