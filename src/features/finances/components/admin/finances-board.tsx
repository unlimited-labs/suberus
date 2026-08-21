import {
	IconCash,
	IconDownload,
	IconPlus,
	IconScale,
	IconShoppingCart,
	IconTrendingDown,
	IconTrendingUp,
	IconX,
} from "@tabler/icons-react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, useBlocker } from "@tanstack/react-router";
import { type ComponentType, useState } from "react";
import { toast } from "sonner";
import {
	addContractorFn,
	financesQueryOptions,
	saveFinancesFn,
} from "@/features/finances/api/finances";
import {
	breakEvenUnits,
	dueStatus,
	type ExpenseFilter,
	type ExpenseSort,
	evalAmount,
	expenseStats,
	type FeeProjectionRow,
	type FinanceRow as FinanceRowValue,
	grossAmount,
	matchesExpenseFilter,
	netAmount,
	projectFeeIncome,
	sortExpenses,
	sumGross,
	sumNet,
} from "@/features/finances/calc";
import { DueCell } from "@/features/finances/components/admin/due-cell";
import { ExpenseToolbar } from "@/features/finances/components/admin/expense-toolbar";
import { FeeProjection } from "@/features/finances/components/admin/fee-projection";
import { MoneyCells } from "@/features/finances/components/admin/money-cells";
import { useAppForm } from "@/shared/hooks/use-app-form";
import { formatCurrency } from "@/shared/lib/format-currency";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";
import { FormulaInput } from "@/shared/ui/formula-input";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { SectionCard } from "@/shared/ui/section-card";
import { Switch } from "@/shared/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/shared/ui/tooltip";

type Mode = "actual" | "sim";

const fmtEditable = (n: number) => (n ? n.toFixed(2) : "");

function StatusChip({
	active,
	label,
	icon: Icon,
	activeClass,
	onClick,
	testId,
}: {
	active: boolean;
	label: string;
	icon: ComponentType<{ className?: string }>;
	activeClass: string;
	onClick: () => void;
	testId: string;
}) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					aria-label={label}
					aria-pressed={active}
					className={cn(
						"flex size-8 items-center justify-center rounded-full border transition-colors",
						active
							? activeClass
							: "border-border text-muted-foreground hover:bg-muted",
					)}
					data-testid={testId}
					onClick={onClick}
					type="button"
				>
					<Icon className="size-4" />
				</button>
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}

const cleanRows = (rows: FinanceRowValue[]) =>
	rows.flatMap((row) => {
		const label = row.label.trim();
		if (label === "") return [];
		return [
			{
				label,
				amountExpr: (row.amountExpr ?? "").trim(),
				contractor: (row.contractor ?? "").trim(),
				vatRate: row.vatRate ?? null,
				amountIsGross: row.amountIsGross ?? true,
				dueDate: row.dueDate ?? "",
				paid: row.paid ?? false,
				ordered: row.ordered ?? false,
			},
		];
	});

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

	const defaultValues = {
		expenses: data.entries.flatMap((entry) =>
			entry.kind === "EXPENSE"
				? [
						{
							label: entry.label,
							amountExpr: entry.amountExpr,
							contractor: entry.contractor ?? "",
							vatRate: entry.vatRate,
							amountIsGross: entry.amountIsGross,
							dueDate: entry.dueDate,
							paid: entry.paid,
							ordered: entry.ordered,
						},
					]
				: [],
		),
		income: data.entries.flatMap((entry) =>
			entry.kind === "INCOME"
				? [
						{
							label: entry.label,
							amountExpr: entry.amountExpr,
							contractor: "",
							// SAFETY: seeds the field so a later numeric edit is not rejected as a literal-null mismatch.
							vatRate: null as number | null,
							amountIsGross: true,
							dueDate: "",
							paid: false,
							ordered: false,
						},
					]
				: [],
		),
	};

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
	const [expenseFilter, setExpenseFilter] = useState<ExpenseFilter>("all");
	const [expenseSort, setExpenseSort] = useState<ExpenseSort>("manual");
	const [confirmRemove, setConfirmRemove] = useState<null | (() => void)>(null);
	const [projection, setProjection] = useState<FeeProjectionRow[]>(() =>
		feeSummary.types.map((type) => ({
			price: type.amount,
			qty: type.paidCount,
		})),
	);

	const projectedFee = projectFeeIncome(projection);
	const todayISO = new Date().toISOString().slice(0, 10);

	const renderLedger = (
		name: "expenses" | "income",
		testIdPrefix: string,
		addLabel: string,
		labelPlaceholder: string,
		withVat: boolean,
	) => (
		<form.Field mode="array" name={name}>
			{(field) => (
				<div className="space-y-2">
					{field.state.value.map((_row, index) =>
						withVat ? (
							<form.Subscribe
								key={index}
								selector={(s) => s.values[name][index]}
							>
								{(row) => {
									const paid = !!row?.paid;
									const ordered = !!row?.ordered;
									const { overdue, days } = dueStatus(
										row?.dueDate,
										todayISO,
										paid,
									);
									const accent = overdue
										? "border-l-destructive"
										: paid
											? "border-l-emerald-500"
											: ordered
												? "border-l-amber-500"
												: "border-l-transparent";
									const hidden =
										!!row &&
										!matchesExpenseFilter(row, expenseFilter, todayISO);
									return (
										<div
											className={cn(
												"space-y-2 rounded-lg border border-l-4 p-3 transition-colors",
												accent,
												overdue
													? "bg-destructive/5"
													: "bg-card hover:border-muted-foreground/30",
												hidden && "hidden",
											)}
										>
											<div className="flex flex-wrap items-center gap-2">
												<form.Field name={`${name}[${index}].label`}>
													{(sub) => (
														<Input
															className="min-w-40 flex-1"
															data-testid={`${testIdPrefix}-label-${index}`}
															onChange={(e) => sub.handleChange(e.target.value)}
															placeholder={labelPlaceholder}
															value={sub.state.value}
														/>
													)}
												</form.Field>
												<form.Field name={`${name}[${index}].contractor`}>
													{(sub) => (
														<Input
															className="w-40"
															data-testid={`${testIdPrefix}-contractor-${index}`}
															list={contractorListId}
															onBlur={() => {
																sub.handleBlur();
																void rememberContractor(sub.state.value ?? "");
															}}
															onChange={(e) => sub.handleChange(e.target.value)}
															placeholder="Contractor"
															type="text"
															value={sub.state.value ?? ""}
														/>
													)}
												</form.Field>
												<form.Field name={`${name}[${index}].ordered`}>
													{(sub) => (
														<StatusChip
															active={sub.state.value}
															activeClass="border-transparent bg-amber-500 text-white"
															icon={IconShoppingCart}
															label="Ordered"
															onClick={() => sub.handleChange(!sub.state.value)}
															testId={`${testIdPrefix}-ordered-${index}`}
														/>
													)}
												</form.Field>
												<form.Field name={`${name}[${index}].paid`}>
													{(sub) => (
														<StatusChip
															active={sub.state.value}
															activeClass="border-transparent bg-emerald-600 text-white"
															icon={IconCash}
															label="Paid"
															onClick={() => sub.handleChange(!sub.state.value)}
															testId={`${testIdPrefix}-paid-${index}`}
														/>
													)}
												</form.Field>
												<Button
													aria-label="Remove row"
													className="ml-auto"
													data-testid={`${testIdPrefix}-remove-${index}`}
													onClick={() =>
														setConfirmRemove(
															() => () => field.removeValue(index),
														)
													}
													size="icon"
													type="button"
													variant="ghost"
												>
													<IconX className="size-4" />
												</Button>
											</div>

											<div className="flex flex-wrap items-start gap-x-3 gap-y-2 border-t pt-2">
												<form.Subscribe selector={(s) => s.values[name][index]}>
													{(current) => {
														const isGross = current?.amountIsGross !== false;
														const vat = current?.vatRate ?? null;
														const netVal = current ? netAmount(current) : 0;
														const grossVal = current ? grossAmount(current) : 0;
														const setSource = (
															expr: string,
															gross: boolean,
														) => {
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
															<MoneyCells
																currency={currency}
																grossValue={
																	isGross
																		? (current?.amountExpr ?? "")
																		: fmtEditable(grossVal)
																}
																index={index}
																netValue={
																	isGross
																		? fmtEditable(netVal)
																		: (current?.amountExpr ?? "")
																}
																onGrossChange={(v) => setSource(v, true)}
																onNetChange={(v) => setSource(v, false)}
																onVatChange={(rate) =>
																	form.setFieldValue(
																		`${name}[${index}].vatRate`,
																		rate,
																	)
																}
																showGrossResult={isGross}
																showNetResult={!isGross}
																testIdPrefix={testIdPrefix}
																vat={vat}
																vatAmount={grossVal - netVal}
																vatRates={vatRates}
															/>
														);
													}}
												</form.Subscribe>
												<form.Field name={`${name}[${index}].dueDate`}>
													{(sub) => (
														<DueCell
															days={days}
															index={index}
															onChange={sub.handleChange}
															overdue={overdue}
															paid={paid}
															testIdPrefix={testIdPrefix}
															value={sub.state.value ?? ""}
														/>
													)}
												</form.Field>
											</div>
										</div>
									);
								}}
							</form.Subscribe>
						) : (
							<div className="flex flex-wrap items-center gap-2" key={index}>
								<form.Field name={`${name}[${index}].label`}>
									{(sub) => (
										<Input
											className="min-w-40 flex-1"
											data-testid={`${testIdPrefix}-label-${index}`}
											onChange={(e) => sub.handleChange(e.target.value)}
											placeholder={labelPlaceholder}
											value={sub.state.value}
										/>
									)}
								</form.Field>
								<form.Field name={`${name}[${index}].amountExpr`}>
									{(sub) => (
										<FormulaInput
											data-testid={`${testIdPrefix}-amount-${index}`}
											evaluate={evalAmount}
											format={(n) => formatCurrency(n, currency)}
											onValueChange={sub.handleChange}
											placeholder="formula (2*250) or value"
											resultTestId={`${testIdPrefix}-amount-eval-${index}`}
											value={sub.state.value}
										/>
									)}
								</form.Field>
								<Button
									aria-label="Remove row"
									data-testid={`${testIdPrefix}-remove-${index}`}
									onClick={() =>
										setConfirmRemove(() => () => field.removeValue(index))
									}
									size="icon"
									type="button"
									variant="ghost"
								>
									<IconX className="size-4" />
								</Button>
							</div>
						),
					)}
					<Button
						data-testid={`${testIdPrefix}-add`}
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
						size="sm"
						type="button"
						variant="outline"
					>
						<IconPlus className="mr-1 size-3" />
						{addLabel}
					</Button>
				</div>
			)}
		</form.Field>
	);

	return (
		<TooltipProvider>
			<form
				className="space-y-6"
				noValidate
				onSubmit={(e) => {
					e.preventDefault();
					void form.handleSubmit();
				}}
			>
				<datalist id={contractorListId}>
					{contractorOptions.map((name) => (
						<option key={name} value={name} />
					))}
				</datalist>

				<div className="space-y-6">
					<SectionCard
						action={
							<div className="flex items-center gap-2">
								<Label
									className="text-muted-foreground text-xs"
									htmlFor="expense-basis-total"
								>
									Total: {expenseBasis === "net" ? "Net" : "Gross"}
								</Label>
								<Switch
									checked={expenseBasis === "gross"}
									data-testid="expense-basis-total"
									id="expense-basis-total"
									onCheckedChange={(checked) =>
										setExpenseBasis(checked ? "gross" : "net")
									}
								/>
							</div>
						}
						icon={IconTrendingDown}
						title="Expenses"
					>
						<div className="space-y-3">
							<form.Subscribe selector={(s) => s.values.expenses}>
								{(rows) => (
									<ExpenseToolbar
										currency={currency}
										filter={expenseFilter}
										onFilter={setExpenseFilter}
										onSort={(sort) => {
											setExpenseSort(sort);
											if (sort !== "manual") {
												form.setFieldValue(
													"expenses",
													sortExpenses(rows, sort),
												);
											}
										}}
										sort={expenseSort}
										stats={expenseStats(rows, todayISO)}
									/>
								)}
							</form.Subscribe>
							{renderLedger(
								"expenses",
								"expense",
								"Add expense",
								"Expense name",
								true,
							)}
						</div>
					</SectionCard>

					<SectionCard
						action={
							<Tabs
								// SAFETY: the select renders only Mode options.
								onValueChange={(value) => setMode(value as Mode)}
								value={mode}
							>
								<TabsList>
									<TabsTrigger
										data-testid="finances-mode-actual"
										value="actual"
									>
										Actual
									</TabsTrigger>
									<TabsTrigger data-testid="finances-mode-sim" value="sim">
										Simulation
									</TabsTrigger>
								</TabsList>
							</Tabs>
						}
						icon={IconTrendingUp}
						title="Income"
					>
						<div className="space-y-4">
							{mode === "actual" ? (
								<div className="border-border/60 bg-muted/20 flex items-center justify-between rounded-md border px-3 py-2">
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
									currency={currency}
									onChange={setProjection}
									rows={projection}
									types={feeSummary.types}
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
						const manualIncome = sumNet(income);
						const feeIncome =
							mode === "actual" ? feeSummary.collectedTotal : projectedFee;
						const totalIncome = manualIncome + feeIncome;
						const netto = totalIncome - totalExpenses;

						const profit = netto >= 0;

						return (
							<div className="space-y-4">
								<div className="flex flex-wrap items-stretch justify-between gap-4">
									<div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
										<div className="bg-muted/30 rounded-lg border p-3">
											<div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
												<IconTrendingDown className="size-3.5" />
												Expenses ({expenseBasis})
											</div>
											<div className="mt-1 text-xl font-semibold tabular-nums">
												{formatCurrency(totalExpenses, currency)}
											</div>
										</div>
										<div className="bg-muted/30 rounded-lg border p-3">
											<div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
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
												<div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
													<IconScale className="size-3.5" />
													Net
												</div>
												<Badge
													className={cn(
														profit &&
															"border-transparent bg-emerald-600 text-white",
													)}
													variant={profit ? "secondary" : "destructive"}
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
												className="w-full"
												label="Save"
												submittingLabel="Saving..."
											/>
										</form.AppForm>
										<Button asChild className="w-full" variant="outline">
											<Link target="_blank" to="/api/admin/finances/export">
												<IconDownload className="mr-2 size-4" />
												Export XLSX
											</Link>
										</Button>
									</div>
								</div>

								{mode === "sim" && feeSummary.types.length > 0 && (
									<div className="bg-muted/20 rounded-lg border p-3">
										<div className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
											Break-even
										</div>
										<div className="flex flex-wrap gap-2">
											{feeSummary.types.map((type, index) => {
												const row = projection[index] ?? {
													price: type.amount,
													qty: 0,
												};
												const price = Number.isFinite(row.price)
													? row.price
													: 0;
												const qty = Number.isFinite(row.qty) ? row.qty : 0;
												const otherIncome = totalIncome - price * qty;
												const units = breakEvenUnits(
													totalExpenses,
													otherIncome,
													price,
												);
												return (
													<div
														className="bg-background flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm"
														data-testid={`finances-breakeven-${index}`}
														key={type.id}
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

			<Dialog
				onOpenChange={(open) => !open && setConfirmRemove(null)}
				open={confirmRemove !== null}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Remove this row?</DialogTitle>
						<DialogDescription>
							The line will be removed from the list. The change is stored when
							you press Save.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button onClick={() => setConfirmRemove(null)} variant="outline">
							Cancel
						</Button>
						<Button
							data-testid="finances-remove-confirm"
							onClick={() => {
								confirmRemove?.();
								setConfirmRemove(null);
							}}
							variant="destructive"
						>
							Remove
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</TooltipProvider>
	);
}
