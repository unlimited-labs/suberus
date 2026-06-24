import {
	IconCash,
	IconLoader2,
	IconPencil,
	IconPlus,
	IconTrash,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { paymentInstructionsQueryOptions } from "@/features/fee/api/fee";
import {
	feeTypesQueryOptions,
	updateFeeInstructionsFn,
	updateFeeTypesFn,
} from "@/features/settings/api/settings";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { getErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Markdown } from "@/shared/ui/markdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Textarea } from "@/shared/ui/textarea";

interface FeeType {
	id: string;
	name: string;
	amount: number;
}

interface FeeTabProps {
	initialInstructions: string;
	initialFeeTypes: FeeType[];
	currency: string;
}

export function FeeTab({
	initialInstructions,
	initialFeeTypes,
	currency,
}: FeeTabProps) {
	const queryClient = useQueryClient();
	const [content, setContent] = useState(initialInstructions);
	const [isSavingInstructions, setIsSavingInstructions] = useState(false);
	const [feeTypes, setFeeTypes] = useState<FeeType[]>(initialFeeTypes);
	const [isSavingTypes, setIsSavingTypes] = useState(false);

	const [editingId, setEditingId] = useState<string | null>(null);
	const [editName, setEditName] = useState("");
	const [editAmount, setEditAmount] = useState("");

	const [showAddForm, setShowAddForm] = useState(false);
	const [newName, setNewName] = useState("");
	const [newAmount, setNewAmount] = useState("");

	const handleSaveInstructions = async () => {
		setIsSavingInstructions(true);
		try {
			await updateFeeInstructionsFn({ data: { content } });
			await queryClient.invalidateQueries({
				queryKey: paymentInstructionsQueryOptions().queryKey,
			});
			toast.success("Fee payment instructions saved");
		} catch (error) {
			toast.error(getErrorMessage(error, "Failed to save fee instructions"));
		} finally {
			setIsSavingInstructions(false);
		}
	};

	const handleSaveFeeTypes = async (types: FeeType[]) => {
		setIsSavingTypes(true);
		try {
			await updateFeeTypesFn({ data: { feeTypes: types } });
			await queryClient.invalidateQueries({
				queryKey: feeTypesQueryOptions().queryKey,
			});
			setFeeTypes(types);
			toast.success("Fee types saved");
		} catch (error) {
			toast.error(getErrorMessage(error, "Failed to save fee types"));
		} finally {
			setIsSavingTypes(false);
		}
	};

	const handleAdd = () => {
		const name = newName.trim();
		const amount = Number.parseFloat(newAmount);
		if (!name || Number.isNaN(amount) || amount < 0) {
			toast.error("Name and valid amount required");
			return;
		}
		const id = crypto.randomUUID().slice(0, 8);
		const updated = [...feeTypes, { id, name, amount }];
		handleSaveFeeTypes(updated);
		setNewName("");
		setNewAmount("");
		setShowAddForm(false);
	};

	const handleStartEdit = (ft: FeeType) => {
		setEditingId(ft.id);
		setEditName(ft.name);
		setEditAmount(ft.amount.toString());
	};

	const handleSaveEdit = () => {
		const name = editName.trim();
		const amount = Number.parseFloat(editAmount);
		if (!name || Number.isNaN(amount) || amount < 0) {
			toast.error("Name and valid amount required");
			return;
		}
		const updated = feeTypes.map((ft) =>
			ft.id === editingId ? { ...ft, name, amount } : ft,
		);
		handleSaveFeeTypes(updated);
		setEditingId(null);
	};

	const handleDelete = (id: string) => {
		const updated = feeTypes.filter((ft) => ft.id !== id);
		if (updated.length === 0) {
			toast.error("At least one fee type required");
			return;
		}
		handleSaveFeeTypes(updated);
	};

	return (
		<div className="space-y-6">
			<SettingsSection
				icon={IconCash}
				title="Fee Types"
				description="Manage fee types and their amounts"
			>
				<div className="space-y-4">
					<div className="rounded-md border">
						<div className="grid grid-cols-[1fr_auto_auto] gap-2 border-b bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground">
							<span>Name</span>
							<span className="w-28 text-right">Amount ({currency})</span>
							<span className="w-20" />
						</div>
						{feeTypes.map((ft) => (
							<div
								key={ft.id}
								className="grid grid-cols-[1fr_auto_auto] items-center gap-2 border-b px-4 py-2 last:border-b-0"
							>
								{editingId === ft.id ? (
									<>
										<Input
											value={editName}
											onChange={(e) => setEditName(e.target.value)}
											className="h-8"
											aria-label="Fee type name"
										/>
										<Input
											type="number"
											value={editAmount}
											onChange={(e) => setEditAmount(e.target.value)}
											className="h-8 w-28 text-right"
											min={0}
											step="0.01"
											aria-label="Fee type amount"
										/>
										<div className="flex w-20 justify-end gap-1">
											<Button
												size="sm"
												variant="ghost"
												className="h-7 px-2"
												onClick={handleSaveEdit}
												disabled={isSavingTypes}
											>
												Save
											</Button>
											<Button
												size="sm"
												variant="ghost"
												className="h-7 px-2"
												onClick={() => setEditingId(null)}
											>
												Cancel
											</Button>
										</div>
									</>
								) : (
									<>
										<span className="text-sm">{ft.name}</span>
										<span className="w-28 text-right text-sm font-medium">
											{ft.amount.toFixed(2)}
										</span>
										<div className="flex w-20 justify-end gap-1">
											<Button
												size="icon"
												variant="ghost"
												className="size-7"
												onClick={() => handleStartEdit(ft)}
												aria-label={`Edit ${ft.name}`}
											>
												<IconPencil className="size-3.5" />
											</Button>
											<Button
												size="icon"
												variant="ghost"
												className="size-7 text-destructive hover:text-destructive"
												onClick={() => handleDelete(ft.id)}
												disabled={isSavingTypes}
												aria-label={`Delete ${ft.name}`}
											>
												<IconTrash className="size-3.5" />
											</Button>
										</div>
									</>
								)}
							</div>
						))}
					</div>

					{showAddForm ? (
						<div className="flex items-end gap-2">
							<div className="flex-1 space-y-1">
								<Label htmlFor="new-fee-name">Name</Label>
								<Input
									id="new-fee-name"
									value={newName}
									onChange={(e) => setNewName(e.target.value)}
									placeholder="e.g. Invited Speaker Fee"
								/>
							</div>
							<div className="w-32 space-y-1">
								<Label htmlFor="new-fee-amount">Amount</Label>
								<Input
									id="new-fee-amount"
									type="number"
									value={newAmount}
									onChange={(e) => setNewAmount(e.target.value)}
									placeholder="0.00"
									min={0}
									step="0.01"
								/>
							</div>
							<Button size="sm" onClick={handleAdd} disabled={isSavingTypes}>
								Add
							</Button>
							<Button
								size="sm"
								variant="ghost"
								onClick={() => setShowAddForm(false)}
							>
								Cancel
							</Button>
						</div>
					) : (
						<Button
							variant="outline"
							size="sm"
							onClick={() => setShowAddForm(true)}
						>
							<IconPlus className="mr-2 size-4" />
							Add Fee Type
						</Button>
					)}
				</div>
			</SettingsSection>

			<SettingsSection
				icon={IconCash}
				title="Payment Instructions"
				description="Configure payment information displayed to users (Markdown supported)"
				delay={100}
			>
				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="instructions">Instructions Content</Label>
						<Tabs defaultValue="edit">
							<TabsList>
								<TabsTrigger value="edit">Edit</TabsTrigger>
								<TabsTrigger value="preview">Preview</TabsTrigger>
							</TabsList>
							<TabsContent value="edit">
								<Textarea
									id="instructions"
									value={content}
									onChange={(e) => setContent(e.target.value)}
									rows={15}
									placeholder="# Payment Instructions&#10;&#10;Enter payment details here..."
									className="font-mono text-sm"
								/>
							</TabsContent>
							<TabsContent value="preview">
								<div className="min-h-[22rem] rounded-md border p-4">
									{content.trim() ? (
										<Markdown content={content} />
									) : (
										<p className="text-sm text-muted-foreground">
											Nothing to preview yet
										</p>
									)}
								</div>
							</TabsContent>
						</Tabs>
						<p className="text-xs text-muted-foreground">
							Supports Markdown formatting (headings, lists, links, bold,
							italic)
						</p>
					</div>

					<div className="flex justify-end">
						<Button
							onClick={handleSaveInstructions}
							disabled={isSavingInstructions}
						>
							{isSavingInstructions && (
								<IconLoader2 className="mr-2 size-4 animate-spin" />
							)}
							Save Instructions
						</Button>
					</div>
				</div>
			</SettingsSection>
		</div>
	);
}
