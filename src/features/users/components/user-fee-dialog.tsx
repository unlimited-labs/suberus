import { Button } from "@/shared/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";

export interface FeeType {
	id: string;
	name: string;
	amount: number;
}

interface UserFeeDialogProps {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	userName: string;
	feeTypes: FeeType[];
	currency: string;
	selectedFeeTypeId: string;
	selectedFeeType: FeeType | undefined;
	onFeeTypeChange: (id: string) => void;
	onConfirm: () => void;
	isPending: boolean;
}

export function UserFeeDialog({
	open,
	onOpenChange,
	userName,
	feeTypes,
	currency,
	selectedFeeTypeId,
	selectedFeeType,
	onFeeTypeChange,
	onConfirm,
	isPending,
}: UserFeeDialogProps) {
	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Mark Fee as Paid</DialogTitle>
					<DialogDescription>
						Select fee type for user {userName}.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-3 py-4">
					<Select
						items={feeTypes.map((type) => ({
							value: type.id,
							label: `${type.name} — ${type.amount.toFixed(2)} ${currency}`,
						}))}
						onValueChange={onFeeTypeChange}
						value={selectedFeeTypeId}
					>
						<SelectTrigger>
							<SelectValue placeholder="Select fee type" />
						</SelectTrigger>
						<SelectContent>
							{feeTypes.map((type) => (
								<SelectItem key={type.id} value={type.id}>
									{type.name} — {type.amount.toFixed(2)} {currency}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{selectedFeeType && (
						<p className="text-muted-foreground text-sm">
							Amount: {selectedFeeType.amount.toFixed(2)} {currency}
						</p>
					)}
				</div>
				<DialogFooter>
					<Button onClick={() => onOpenChange(false)} variant="outline">
						Cancel
					</Button>
					<Button disabled={isPending} onClick={onConfirm}>
						{isPending ? "Saving..." : "Save"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
