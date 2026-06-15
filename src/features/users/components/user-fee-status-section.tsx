import { IconCash, IconX } from "@tabler/icons-react";
import type { AdminUserDetail } from "@/features/users/server/users";
import { Button } from "@/shared/ui/button";

interface UserFeeStatusSectionProps {
	fee: AdminUserDetail["fee"];
	fmtDate: (date: Date | null) => string;
	isPending: boolean;
	onMark: () => void;
	onUnmark: () => void;
}

export function UserFeeStatusSection({
	fee,
	fmtDate,
	isPending,
	onMark,
	onUnmark,
}: UserFeeStatusSectionProps) {
	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-medium text-muted-foreground">
					Fee Status
				</h3>
				{!fee?.paid && (
					<Button variant="outline" size="sm" onClick={onMark}>
						<IconCash className="mr-2 size-4" />
						Mark as Paid
					</Button>
				)}
			</div>
			{fee?.paid ? (
				<div className="rounded-lg border bg-green-50 p-4 dark:bg-green-950/20">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<IconCash className="size-5 text-green-600" />
							<span className="font-medium text-green-700 dark:text-green-400">
								Fee Paid
							</span>
						</div>
						<Button
							variant="ghost"
							size="sm"
							className="h-7 text-muted-foreground hover:text-destructive"
							onClick={onUnmark}
							disabled={isPending}
						>
							<IconX className="mr-1 size-3.5" />
							Unmark
						</Button>
					</div>
					<p className="mt-1 text-sm text-green-600 dark:text-green-500">
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
			)}
		</div>
	);
}
