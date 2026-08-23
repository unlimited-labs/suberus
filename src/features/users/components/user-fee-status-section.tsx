import { IconCash, IconX } from "@tabler/icons-react";
import type { AdminUserDetail } from "@/features/users/server/users";
import { Button } from "@/shared/ui/button";

interface UserFeeStatusSectionProps {
	fee: AdminUserDetail["fee"];
	fmtDate: (date: Date | null) => string;
	isPending: boolean;
	onUnmark: () => void;
}

export function UserFeeStatusSection({
	fee,
	fmtDate,
	isPending,
	onUnmark,
}: UserFeeStatusSectionProps) {
	return fee?.paid ? (
		<div className="rounded-lg border bg-green-50 p-4 dark:bg-green-950/20">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<IconCash className="size-5 text-green-600" />
					<span className="font-medium text-green-700 dark:text-green-400">
						Fee Paid
					</span>
				</div>
				<Button
					className="text-muted-foreground hover:text-destructive h-7"
					disabled={isPending}
					onClick={onUnmark}
					size="sm"
					variant="ghost"
				>
					<IconX className="mr-1 size-3.5" />
					Unmark
				</Button>
			</div>
			<p
				className="mt-1 text-sm text-green-600 dark:text-green-500"
				data-testid="fee-summary"
			>
				Type: {fee.type}
				{fee.amount !== null && fee.currency && (
					<>
						{" • "}
						Amount: {fee.amount.toFixed(2)} {fee.currency}
					</>
				)}
				{" • "}
				Paid on: {fmtDate(fee.paidAt)}
			</p>
		</div>
	) : (
		<div className="rounded-lg border bg-red-50 p-4 dark:bg-red-950/20">
			<div className="flex items-center gap-2">
				<IconCash className="size-5 text-red-600" />
				<span className="font-medium text-red-700 dark:text-red-400">
					Fee Unpaid
				</span>
			</div>
		</div>
	);
}
