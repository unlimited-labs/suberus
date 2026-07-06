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
		<Dialog open={open} onOpenChange={onOpenChange}>
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
						value={selectedFeeTypeId}
						onValueChange={onFeeTypeChange}
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
						<p className="text-sm text-muted-foreground">
							Amount: {selectedFeeType.amount.toFixed(2)} {currency}
						</p>
					)}
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={onConfirm} disabled={isPending}>
						{isPending ? "Saving..." : "Save"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
