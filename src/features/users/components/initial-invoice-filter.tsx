import { useEffect } from "react";
import type { InvoiceState } from "@/features/settings/billing-details-rules";
import type { AdminUser } from "@/features/users/server/users";
import type { AppTable } from "@/shared/ui/data-table/table-features";

/** Applies the `?invoice=` filter from a link (e.g. the settings warning) once. */
export function InitialInvoiceFilter({
	table,
	invoice,
}: {
	table: AppTable<AdminUser>;
	invoice: InvoiceState | undefined;
}) {
	useEffect(() => {
		if (invoice) table.getColumn("invoice")?.setFilterValue([invoice]);
	}, [table, invoice]);
	return null;
}
