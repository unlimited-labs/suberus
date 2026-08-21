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
	adminSettingQueryOptions,
	feeEnabledQueryOptions,
	feeTypesQueryOptions,
	setSettingFn,
	updateFeeInstructionsFn,
	updateFeeTypesFn,
} from "@/features/settings/api/settings";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { getErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Markdown, MarkdownHint } from "@/shared/ui/markdown";
import { Switch } from "@/shared/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Textarea } from "@/shared/ui/textarea";

interface FeeType {
	id: string;
	name: string;
	amount: number;
}

function parseAmount(value: string) {
	return value.trim() === "" ? 0 : Number.parseFloat(value);
}

interface FeeTabProps {
	initialEnabled: boolean;
	initialInstructions: string;
	initialFeeTypes: FeeType[];
	currency: string;
}

export function FeeTab({
	initialEnabled,
	initialInstructions,
	initialFeeTypes,
	currency,
}: FeeTabProps) {
	const queryClient = useQueryClient();
	const [enabled, setEnabled] = useState(initialEnabled);
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

	const handleToggleEnabled = async (checked: boolean) => {
		setEnabled(checked);
		try {
			await setSettingFn({ data: { key: "FEE_ENABLED", value: checked } });
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: adminSettingQueryOptions("FEE_ENABLED").queryKey,
				}),
				queryClient.invalidateQueries({
					queryKey: feeEnabledQueryOptions().queryKey,
				}),
			]);
			toast.success(checked ? "Fee enabled" : "Fee disabled");
		} catch (error) {
			setEnabled(!checked);
			toast.error(getErrorMessage(error, "Failed to update fee setting"));
		}
	};

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
		}
		setIsSavingInstructions(false);
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
		}
		setIsSavingTypes(false);
	};

	const handleAdd = () => {
		const name = newName.trim();
		const amount = parseAmount(newAmount);
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
		const amount = parseAmount(editAmount);
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
				description="Show the Fee page to participants"
				icon={IconCash}
				title="Fee"
			>
				<div className="flex items-center justify-between">
					<Label className="font-medium" htmlFor="fee-enabled">
						Fee enabled
					</Label>
					<Switch
						checked={enabled}
						id="fee-enabled"
						onCheckedChange={handleToggleEnabled}
					/>
				</div>
			</SettingsSection>

			<SettingsSection
				description="Manage fee types and their amounts"
				icon={IconCash}
				title="Fee Types"
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
								className="grid grid-cols-[1fr_auto_auto] items-center gap-2 border-b px-4 py-2 last:border-b-0"
								key={ft.id}
							>
								{editingId === ft.id ? (
									<>
										<Input
											aria-label="Fee type name"
											className="h-8"
											onChange={(e) => setEditName(e.target.value)}
											value={editName}
										/>
										<Input
											aria-label="Fee type amount"
											className="h-8 w-28 text-right"
											min={0}
											onChange={(e) => setEditAmount(e.target.value)}
											step="0.01"
											type="number"
											value={editAmount}
										/>
										<div className="flex w-20 justify-end gap-1">
											<Button
												className="h-7 px-2"
												disabled={isSavingTypes}
												onClick={handleSaveEdit}
												size="sm"
												variant="ghost"
											>
												Save
											</Button>
											<Button
												className="h-7 px-2"
												onClick={() => setEditingId(null)}
												size="sm"
												variant="ghost"
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
												aria-label={`Edit ${ft.name}`}
												className="size-7"
												onClick={() => handleStartEdit(ft)}
												size="icon"
												variant="ghost"
											>
												<IconPencil className="size-3.5" />
											</Button>
											<Button
												aria-label={`Delete ${ft.name}`}
												className="size-7 text-destructive hover:text-destructive"
												disabled={isSavingTypes}
												onClick={() => handleDelete(ft.id)}
												size="icon"
												variant="ghost"
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
									onChange={(e) => setNewName(e.target.value)}
									placeholder="e.g. Invited Speaker Fee"
									value={newName}
								/>
							</div>
							<div className="w-32 space-y-1">
								<Label htmlFor="new-fee-amount">Amount</Label>
								<Input
									id="new-fee-amount"
									min={0}
									onChange={(e) => setNewAmount(e.target.value)}
									placeholder="0.00"
									step="0.01"
									type="number"
									value={newAmount}
								/>
							</div>
							<Button disabled={isSavingTypes} onClick={handleAdd} size="sm">
								Add
							</Button>
							<Button
								onClick={() => setShowAddForm(false)}
								size="sm"
								variant="ghost"
							>
								Cancel
							</Button>
						</div>
					) : (
						<Button
							onClick={() => setShowAddForm(true)}
							size="sm"
							variant="outline"
						>
							<IconPlus className="mr-2 size-4" />
							Add Fee Type
						</Button>
					)}
				</div>
			</SettingsSection>

			<SettingsSection
				delay={100}
				description="Configure payment information displayed to users (Markdown supported)"
				icon={IconCash}
				title="Payment Instructions"
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
									className="font-mono text-sm"
									id="instructions"
									onChange={(e) => setContent(e.target.value)}
									placeholder="# Payment Instructions&#10;&#10;Enter payment details here..."
									rows={15}
									value={content}
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
						<MarkdownHint />
					</div>

					<div className="flex justify-end">
						<Button
							disabled={isSavingInstructions}
							onClick={handleSaveInstructions}
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
