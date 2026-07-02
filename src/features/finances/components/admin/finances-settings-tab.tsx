import { IconCash, IconPercentage, IconPlus, IconX } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
	financesEnabledQueryOptions,
	financesVatRatesQueryOptions,
	setSettingFn,
	updateFinancesVatRatesFn,
} from "@/features/settings/api/settings";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { getErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";

interface VatRate {
	id: string;
	rate: number;
}

export function FinancesSettingsTab({
	initialEnabled,
	initialVatRates,
}: {
	initialEnabled: boolean;
	initialVatRates: VatRate[];
}) {
	const queryClient = useQueryClient();
	const [enabled, setEnabled] = useState(initialEnabled);
	const [vatRates, setVatRates] = useState<VatRate[]>(initialVatRates);
	const [newRate, setNewRate] = useState("");

	const handleToggleEnabled = async (checked: boolean) => {
		setEnabled(checked);
		try {
			await setSettingFn({ data: { key: "FINANCES_ENABLED", value: checked } });
			await queryClient.invalidateQueries({
				queryKey: financesEnabledQueryOptions().queryKey,
			});
			toast.success(checked ? "Finances enabled" : "Finances disabled");
		} catch (error) {
			setEnabled(!checked);
			toast.error(getErrorMessage(error, "Failed to update finances setting"));
		}
	};

	const saveVatRates = async (rates: VatRate[]) => {
		const previous = vatRates;
		setVatRates(rates);
		try {
			await updateFinancesVatRatesFn({ data: { vatRates: rates } });
			await queryClient.invalidateQueries({
				queryKey: financesVatRatesQueryOptions().queryKey,
			});
			toast.success("VAT rates saved");
		} catch (error) {
			setVatRates(previous);
			toast.error(getErrorMessage(error, "Failed to save VAT rates"));
		}
	};

	const handleAddRate = () => {
		const rate = Number.parseInt(newRate, 10);
		if (Number.isNaN(rate) || rate < 0 || rate > 100) {
			toast.error("Enter a rate between 0 and 100");
			return;
		}
		if (vatRates.some((r) => r.rate === rate)) {
			toast.error("That rate already exists");
			return;
		}
		saveVatRates([...vatRates, { id: `vat-${rate}`, rate }]);
		setNewRate("");
	};

	return (
		<div className="space-y-6">
			<SettingsSection
				icon={IconCash}
				title="Finances"
				description="Show the Finances screen in the admin menu"
			>
				<div className="flex items-center justify-between">
					<Label htmlFor="finances-enabled" className="font-medium">
						Finances enabled
					</Label>
					<Switch
						id="finances-enabled"
						checked={enabled}
						onCheckedChange={handleToggleEnabled}
					/>
				</div>
			</SettingsSection>

			{enabled && (
				<SettingsSection
					icon={IconPercentage}
					title="VAT rates"
					description="Rates offered when entering a cost as net or gross"
				>
					<div className="space-y-4">
						<div className="rounded-md border">
							<div className="grid grid-cols-[1fr_auto] gap-2 border-b bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground">
								<span>Rate</span>
								<span className="w-8" />
							</div>
							{vatRates.length === 0 ? (
								<p className="px-4 py-3 text-sm text-muted-foreground">
									No VAT rates yet.
								</p>
							) : (
								vatRates.map((vat) => (
									<div
										key={vat.id}
										className="grid grid-cols-[1fr_auto] items-center gap-2 border-b px-4 py-2 last:border-b-0"
										data-testid={`vat-row-${vat.rate}`}
									>
										<span className="tabular-nums">{vat.rate}%</span>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											aria-label={`Remove ${vat.rate}% VAT`}
											onClick={() =>
												saveVatRates(vatRates.filter((r) => r.id !== vat.id))
											}
										>
											<IconX className="size-4" />
										</Button>
									</div>
								))
							)}
						</div>
						<div className="flex items-end gap-2">
							<div className="space-y-1">
								<Label htmlFor="new-vat-rate" className="text-xs">
									New rate (%)
								</Label>
								<Input
									id="new-vat-rate"
									type="number"
									min={0}
									max={100}
									step="1"
									value={newRate}
									onChange={(e) => setNewRate(e.target.value)}
									className="w-32"
									data-testid="vat-new-rate"
								/>
							</div>
							<Button
								type="button"
								variant="outline"
								onClick={handleAddRate}
								data-testid="vat-add"
							>
								<IconPlus className="mr-1 size-4" />
								Add
							</Button>
						</div>
					</div>
				</SettingsSection>
			)}
		</div>
	);
}
