import {
	IconDownload,
	IconPlus,
	IconScale,
	IconTrendingDown,
	IconTrendingUp,
	IconX,
} from "@tabler/icons-react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, useBlocker } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
	addContractorFn,
	financesQueryOptions,
	saveFinancesFn,
} from "@/features/finances/api/finances";
import {
	breakEvenUnits,
	evalAmount,
	type FeeProjectionRow,
	type FinanceRow as FinanceRowValue,
	grossAmount,
	netAmount,
	projectFeeIncome,
	sumGross,
	sumNet,
	sumRows,
} from "@/features/finances/calc";
import { FeeProjection } from "@/features/finances/components/admin/fee-projection";
import { useAppForm } from "@/shared/hooks/use-app-form";
import { formatCurrency } from "@/shared/lib/format-currency";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { FormulaInput } from "@/shared/ui/formula-input";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { SectionCard } from "@/shared/ui/section-card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";
import { Switch } from "@/shared/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";

type Mode = "actual" | "sim";

const fmtEditable = (n: number) => (n ? n.toFixed(2) : "");

function StatusChip({
	active,
	label,
	activeClass,
	onClick,
	testId,
}: {
	active: boolean;
	label: string;
	activeClass: string;
	onClick: () => void;
	testId: string;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-pressed={active}
			data-testid={testId}
			className={cn(
				"rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
				active
					? activeClass
					: "border-border text-muted-foreground hover:bg-muted",
			)}
		>
			{label}
		</button>
	);
}

const cleanRows = (rows: FinanceRowValue[]) =>
	rows
		.filter((row) => row.label.trim() !== "")
		.map((row) => ({
			label: row.label.trim(),
			amountExpr: (row.amountExpr ?? "").trim(),
			contractor: (row.contractor ?? "").trim(),
			vatRate: row.vatRate ?? null,
			amountIsGross: row.amountIsGross ?? true,
			dueDate: row.dueDate ?? "",
			paid: row.paid ?? false,
			ordered: row.ordered ?? false,
		}));

export function FinancesBoard() {
	const { data } = useSuspenseQuery(financesQueryOptions());
	const queryClient = useQueryClient();
	const { feeSummary, vatRates } = data;
	const currency = feeSummary.currency;
	const contractorListId = "finance-contractors";
	const [contractorOptions, setContractorOptions] = useState<string[]>(
		data.contractors,
	);

	const rememberContractor = async (name: string) => {
		const trimmed = name.trim();
		if (
			!trimmed ||
			contractorOptions.some((c) => c.toLowerCase() === trimmed.toLowerCase())
		) {
			return;
		}
		setContractorOptions(await addContractorFn({ data: { name: trimmed } }));
	};

	const defaultValues = useMemo(
		() => ({
			expenses: data.entries
				.filter((entry) => entry.kind === "EXPENSE")
				.map((entry) => ({
					label: entry.label,
					amountExpr: entry.amountExpr,
					contractor: entry.contractor ?? "",
					vatRate: entry.vatRate,
					amountIsGross: entry.amountIsGross,
					dueDate: entry.dueDate,
					paid: entry.paid,
					ordered: entry.ordered,
				})),
			income: data.entries
				.filter((entry) => entry.kind === "INCOME")
				.map((entry) => ({
					label: entry.label,
					amountExpr: entry.amountExpr,
					contractor: "",
					vatRate: null as number | null,
					amountIsGross: true,
					dueDate: "",
					paid: false,
					ordered: false,
				})),
		}),
		[data.entries],
	);

	const form = useAppForm({
		defaultValues,
		onSubmit: async ({ value, formApi }) => {
			const payload = {
				expenses: cleanRows(value.expenses),
				income: cleanRows(value.income),
			};
			await saveFinancesFn({ data: payload });
			await queryClient.invalidateQueries({
				queryKey: financesQueryOptions().queryKey,
			});
			formApi.reset(payload);
			toast.success("Saved");
		},
	});

	useBlocker({
		shouldBlockFn: () => {
			if (!form.state.isDirty) return false;
			return !window.confirm("You have unsaved changes. Leave without saving?");
		},
		enableBeforeUnload: () => form.state.isDirty,
	});

	const [mode, setMode] = useState<Mode>("actual");
	const [expenseBasis, setExpenseBasis] = useState<"gross" | "net">("gross");
	const [projection, setProjection] = useState<FeeProjectionRow[]>(() =>
		feeSummary.types.map((type) => ({
			price: type.amount,
			qty: type.paidCount,
		})),
	);

	const projectedFee = projectFeeIncome(projection);

	const renderLedger = (
		name: "expenses" | "income",
		testIdPrefix: string,
		addLabel: string,
		labelPlaceholder: string,
		withVat: boolean,
	) => (
		<form.Field name={name} mode="array">
			{(field) => (
				<div className="space-y-2">
					{field.state.value.map((_row, index) =>
						withVat ? (
							<div
								key={index}
								className="space-y-2 rounded-lg border bg-card p-3"
							>
								<div className="flex flex-wrap items-center gap-2">
									<form.Field name={`${name}[${index}].label`}>
										{(sub) => (
											<Input
												value={sub.state.value}
												placeholder={labelPlaceholder}
												onChange={(e) => sub.handleChange(e.target.value)}
												data-testid={`${testIdPrefix}-label-${index}`}
												className="min-w-40 flex-1"
											/>
										)}
									</form.Field>
									<form.Field name={`${name}[${index}].contractor`}>
										{(sub) => (
											<Input
												type="text"
												list={contractorListId}
												value={sub.state.value ?? ""}
												placeholder="Contractor"
												onChange={(e) => sub.handleChange(e.target.value)}
												onBlur={() => {
													sub.handleBlur();
													void rememberContractor(sub.state.value ?? "");
												}}
												data-testid={`${testIdPrefix}-contractor-${index}`}
												className="w-40"
											/>
										)}
									</form.Field>
									<form.Field name={`${name}[${index}].ordered`}>
										{(sub) => (
											<StatusChip
												active={sub.state.value}
												label="Ordered"
												activeClass="border-transparent bg-amber-500 text-white"
												onClick={() => sub.handleChange(!sub.state.value)}
												testId={`${testIdPrefix}-ordered-${index}`}
											/>
										)}
									</form.Field>
									<form.Field name={`${name}[${index}].paid`}>
										{(sub) => (
											<StatusChip
												active={sub.state.value}
												label="Paid"
												activeClass="border-transparent bg-emerald-600 text-white"
												onClick={() => sub.handleChange(!sub.state.value)}
												testId={`${testIdPrefix}-paid-${index}`}
											/>
										)}
									</form.Field>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										onClick={() => field.removeValue(index)}
										aria-label="Remove row"
										data-testid={`${testIdPrefix}-remove-${index}`}
										className="ml-auto"
									>
										<IconX className="size-4" />
									</Button>
								</div>

								<div className="flex flex-wrap items-center gap-x-3 gap-y-2">
									<form.Subscribe selector={(s) => s.values[name][index]}>
										{(current) => {
											const isGross = current?.amountIsGross !== false;
											const vat = current?.vatRate ?? null;
											const netVal = current ? netAmount(current) : 0;
											const grossVal = current ? grossAmount(current) : 0;
											const setSource = (expr: string, gross: boolean) => {
												form.setFieldValue(
													`${name}[${index}].amountExpr`,
													expr,
												);
												form.setFieldValue(
													`${name}[${index}].amountIsGross`,
													gross,
												);
											};
											return (
												<>
													<span className="flex items-center gap-1.5 text-xs text-muted-foreground">
														Netto
														<Input
															type="text"
															value={
																isGross
																	? fmtEditable(netVal)
																	: (current?.amountExpr ?? "")
															}
															placeholder="0.00"
															onChange={(e) => setSource(e.target.value, false)}
															data-testid={`${testIdPrefix}-net-${index}`}
															className={cn(
																"w-28 text-right tabular-nums",
																isGross && "text-muted-foreground",
															)}
														/>
													</span>
													<span className="flex items-center gap-1.5 text-xs text-muted-foreground">
														VAT
														<Select
															value={vat == null ? "none" : String(vat)}
															onValueChange={(v) =>
																form.setFieldValue(
																	`${name}[${index}].vatRate`,
																	v === "none" ? null : Number(v),
																)
															}
														>
															<SelectTrigger
																className="w-24"
																data-testid={`${testIdPrefix}-vat-${index}`}
															>
																<SelectValue />
															</SelectTrigger>
															<SelectContent>
																<SelectItem value="none">No VAT</SelectItem>
																{vatRates.map((rate) => (
																	<SelectItem
																		key={rate.id}
																		value={String(rate.rate)}
																	>
																		{rate.rate}%
																	</SelectItem>
																))}
															</SelectContent>
														</Select>
													</span>
													<span
														className={cn(
															"text-xs tabular-nums",
															vat &&
																"rounded bg-muted px-1.5 py-0.5 text-foreground/70",
														)}
														data-testid={`${testIdPrefix}-vatamt-${index}`}
													>
														{vat
															? `+ ${formatCurrency(grossVal - netVal, currency)}`
															: null}
													</span>
													<span className="flex items-center gap-1.5 text-xs text-muted-foreground">
														Gross
														<Input
															type="text"
															value={
																isGross
																	? (current?.amountExpr ?? "")
																	: fmtEditable(grossVal)
															}
															placeholder="0.00"
															onChange={(e) => setSource(e.target.value, true)}
															data-testid={`${testIdPrefix}-gross-${index}`}
															className={cn(
																"w-28 text-right tabular-nums",
																!isGross && "text-muted-foreground",
															)}
														/>
													</span>
												</>
											);
										}}
									</form.Subscribe>
									<span className="flex items-center gap-1.5 text-xs text-muted-foreground">
										Due
										<form.Field name={`${name}[${index}].dueDate`}>
											{(sub) => (
												<Input
													type="date"
													value={sub.state.value ?? ""}
													onChange={(e) => sub.handleChange(e.target.value)}
													data-testid={`${testIdPrefix}-due-${index}`}
													className="w-40"
												/>
											)}
										</form.Field>
									</span>
								</div>
							</div>
						) : (
							<div key={index} className="flex flex-wrap items-center gap-2">
								<form.Field name={`${name}[${index}].label`}>
									{(sub) => (
										<Input
											value={sub.state.value}
											placeholder={labelPlaceholder}
											onChange={(e) => sub.handleChange(e.target.value)}
											data-testid={`${testIdPrefix}-label-${index}`}
											className="min-w-40 flex-1"
										/>
									)}
								</form.Field>
								<form.Field name={`${name}[${index}].amountExpr`}>
									{(sub) => (
										<FormulaInput
											value={sub.state.value}
											onValueChange={sub.handleChange}
											evaluate={evalAmount}
											format={(n) => formatCurrency(n, currency)}
											placeholder="formula (2*250) or value"
											data-testid={`${testIdPrefix}-amount-${index}`}
											resultTestId={`${testIdPrefix}-amount-eval-${index}`}
											className="w-28 text-right tabular-nums"
										/>
									)}
								</form.Field>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									onClick={() => field.removeValue(index)}
									aria-label="Remove row"
									data-testid={`${testIdPrefix}-remove-${index}`}
								>
									<IconX className="size-4" />
								</Button>
							</div>
						),
					)}
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() =>
							field.pushValue({
								label: "",
								amountExpr: "",
								contractor: "",
								vatRate: null,
								amountIsGross: true,
								dueDate: "",
								paid: false,
								ordered: false,
							})
						}
						data-testid={`${testIdPrefix}-add`}
					>
						<IconPlus className="mr-1 size-3" />
						{addLabel}
					</Button>
				</div>
			)}
		</form.Field>
	);

	return (
		<form
			noValidate
			onSubmit={(e) => {
				e.preventDefault();
				void form.handleSubmit();
			}}
			className="space-y-6"
		>
			<datalist id={contractorListId}>
				{contractorOptions.map((name) => (
					<option key={name} value={name} />
				))}
			</datalist>

			<div className="flex justify-end">
				<Tabs value={mode} onValueChange={(value) => setMode(value as Mode)}>
					<TabsList>
						<TabsTrigger value="actual" data-testid="finances-mode-actual">
							Actual
						</TabsTrigger>
						<TabsTrigger value="sim" data-testid="finances-mode-sim">
							Simulation
						</TabsTrigger>
					</TabsList>
				</Tabs>
			</div>

			<div className="space-y-6">
				<SectionCard
					icon={IconTrendingDown}
					title="Expenses"
					action={
						<div className="flex items-center gap-2">
							<Label
								htmlFor="expense-basis-total"
								className="text-xs text-muted-foreground"
							>
								Total: {expenseBasis === "net" ? "Net" : "Gross"}
							</Label>
							<Switch
								id="expense-basis-total"
								checked={expenseBasis === "gross"}
								onCheckedChange={(checked) =>
									setExpenseBasis(checked ? "gross" : "net")
								}
								data-testid="expense-basis-total"
							/>
						</div>
					}
				>
					{renderLedger(
						"expenses",
						"expense",
						"Add expense",
						"Expense name",
						true,
					)}
				</SectionCard>

				<SectionCard icon={IconTrendingUp} title="Income">
					<div className="space-y-4">
						{mode === "actual" ? (
							<div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/20 px-3 py-2">
								<span className="text-sm">Registration fees</span>
								<span
									className="text-sm font-medium tabular-nums"
									data-testid="finances-fee-collected"
								>
									{formatCurrency(feeSummary.collectedTotal, currency)}
								</span>
							</div>
						) : (
							<FeeProjection
								types={feeSummary.types}
								rows={projection}
								currency={currency}
								onChange={setProjection}
							/>
						)}
						{renderLedger(
							"income",
							"income",
							"Add income",
							"Income source",
							false,
						)}
					</div>
				</SectionCard>
			</div>

			<form.Subscribe
				selector={(s) => ({
					expenses: s.values.expenses,
					income: s.values.income,
				})}
			>
				{({ expenses, income }) => {
					const totalExpenses =
						expenseBasis === "net" ? sumNet(expenses) : sumGross(expenses);
					const manualIncome = sumRows(income);
					const feeIncome =
						mode === "actual" ? feeSummary.collectedTotal : projectedFee;
					const totalIncome = manualIncome + feeIncome;
					const netto = totalIncome - totalExpenses;

					const profit = netto >= 0;

					return (
						<div className="space-y-4">
							<div className="flex flex-wrap items-stretch justify-between gap-4">
								<div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
									<div className="rounded-lg border bg-muted/30 p-3">
										<div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
											<IconTrendingDown className="size-3.5" />
											Expenses ({expenseBasis})
										</div>
										<div className="mt-1 text-xl font-semibold tabular-nums">
											{formatCurrency(totalExpenses, currency)}
										</div>
									</div>
									<div className="rounded-lg border bg-muted/30 p-3">
										<div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
											<IconTrendingUp className="size-3.5" />
											Income
										</div>
										<div className="mt-1 text-xl font-semibold tabular-nums">
											{formatCurrency(totalIncome, currency)}
										</div>
									</div>
									<div
										className={cn(
											"rounded-lg border p-3",
											profit
												? "border-emerald-500/30 bg-emerald-500/5"
												: "border-destructive/30 bg-destructive/5",
										)}
									>
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
												<IconScale className="size-3.5" />
												Net
											</div>
											<Badge
												variant={profit ? "secondary" : "destructive"}
												className={cn(
													profit &&
														"border-transparent bg-emerald-600 text-white",
												)}
											>
												{profit ? "Profit" : "Loss"}
											</Badge>
										</div>
										<div
											className={cn(
												"mt-1 text-2xl font-bold tabular-nums",
												profit ? "text-emerald-600" : "text-destructive",
											)}
											data-testid="finances-netto"
										>
											{formatCurrency(netto, currency)}
										</div>
									</div>
								</div>
								<div className="flex w-40 flex-col gap-2">
									<form.AppForm>
										<form.SubmitButton
											label="Save"
											submittingLabel="Saving..."
											className="w-full"
										/>
									</form.AppForm>
									<Button variant="outline" className="w-full" asChild>
										<Link to="/api/admin/finances/export" target="_blank">
											<IconDownload className="mr-2 size-4" />
											Export XLSX
										</Link>
									</Button>
								</div>
							</div>

							{mode === "sim" && feeSummary.types.length > 0 && (
								<div className="rounded-lg border bg-muted/20 p-3">
									<div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
										Break-even
									</div>
									<div className="flex flex-wrap gap-2">
										{feeSummary.types.map((type, index) => {
											const row = projection[index] ?? {
												price: type.amount,
												qty: 0,
											};
											const price = Number.isFinite(row.price) ? row.price : 0;
											const qty = Number.isFinite(row.qty) ? row.qty : 0;
											const otherIncome = totalIncome - price * qty;
											const units = breakEvenUnits(
												totalExpenses,
												otherIncome,
												price,
											);
											return (
												<div
													key={type.id}
													data-testid={`finances-breakeven-${index}`}
													className="flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1 text-sm"
												>
													<span className="font-medium">{type.name}</span>
													<span className="text-muted-foreground">
														{units === null
															? "never (price ≤ 0)"
															: `${units} fees`}
													</span>
												</div>
											);
										})}
									</div>
								</div>
							)}
						</div>
					);
				}}
			</form.Subscribe>
		</form>
	);
}
