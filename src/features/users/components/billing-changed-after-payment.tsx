import { IconAlertTriangle } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BILLING_AUDIT_LABELS } from "@/features/settings/billing-details-rules";
import {
	acknowledgeAdminUserBillingChange,
	adminUsersQueryOptions,
} from "@/features/users/api/users";
import type { AdminUserDetail } from "@/features/users/server/users";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import type { BillingChanges } from "@/shared/lib/billing-changes";
import { getErrorMessage } from "@/shared/lib/error-message";
import { lookup } from "@/shared/lib/lookup";
import {
	Alert,
	AlertAction,
	AlertDescription,
	AlertTitle,
} from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";

function shown(value: string | boolean | null) {
	if (value === true) return "Yes";
	if (value === false) return "No";
	return value || "—";
}

function ChangeRows({ changes }: { changes: BillingChanges }) {
	return (
		<dl className="mt-2 space-y-1.5">
			{Object.entries(changes).map(([field, change]) => (
				<div className="grid gap-0.5 sm:grid-cols-3 sm:gap-3" key={field}>
					<dt className="font-medium">
						{lookup(BILLING_AUDIT_LABELS, field) ?? field}
					</dt>
					<dd className="whitespace-pre-line sm:col-span-2">
						<span className="line-through">{shown(change.from)}</span>
						{" → "}
						{shown(change.to)}
					</dd>
				</div>
			))}
		</dl>
	);
}

export function BillingChangedAfterPayment({
	user,
}: {
	user: AdminUserDetail;
}) {
	const { formatDateTime } = useDateFormat();
	const queryClient = useQueryClient();
	const acknowledge = useMutation({
		mutationFn: () =>
			acknowledgeAdminUserBillingChange({ data: { id: user.id } }),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: adminUsersQueryOptions().queryKey,
			}),
		onError: (error) =>
			toast.error(getErrorMessage(error, "Could not acknowledge the change")),
	});
	if (!user.billingChangedAfterPaymentAt) return null;

	return (
		<Alert data-testid="billing-changed-after-payment-alert">
			<IconAlertTriangle />
			<AlertTitle>Changed after payment</AlertTitle>
			<AlertDescription>
				<p>
					The participant changed billing details after the fee was paid (first
					change {formatDateTime(user.billingChangedAfterPaymentAt)}). Check
					whether an invoice was already issued.
				</p>
				{user.billingChangesAfterPayment &&
				Object.keys(user.billingChangesAfterPayment).length > 0 ? (
					<ChangeRows changes={user.billingChangesAfterPayment} />
				) : (
					<p className="mt-2">Their edits ended where they started.</p>
				)}
			</AlertDescription>
			<AlertAction>
				<Button
					disabled={acknowledge.isPending}
					onClick={() => acknowledge.mutate()}
					size="sm"
					type="button"
					variant="outline"
				>
					Acknowledge
				</Button>
			</AlertAction>
		</Alert>
	);
}
