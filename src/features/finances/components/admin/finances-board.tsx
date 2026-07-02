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
import { type ComponentType, useMemo, useState } from "react";
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
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/shared/ui/tooltip";

type Mode = "actual" | "sim";

const fmtEditable = (n: number) => (n ? n.toFixed(2) : "");

const AVATAR_COLORS = [
	"bg-rose-500",
	"bg-amber-500",
	"bg-emerald-500",
	"bg-sky-500",
	"bg-violet-500",
	"bg-teal-500",
];
const avatarColor = (name: string) =>
	AVATAR_COLORS[
		[...name].reduce((sum, c) => sum + c.charCodeAt(0), 0) %
			AVATAR_COLORS.length
	];

type ExpenseSort = "manual" | "due" | "amount" | "name";
type ExpenseFilter = "all" | "unpaid" | "overdue" | "paid";

const expenseComparator =
	(sort: ExpenseSort) => (a: FinanceRowValue, b: FinanceRowValue) => {
		if (sort === "due")
			return (a.dueDate || "9999-99-99").localeCompare(
				b.dueDate || "9999-99-99",
			);
		if (sort === "amount") return grossAmount(b) - grossAmount(a);
		if (sort === "name") return a.label.localeCompare(b.label);
		return 0;
	};

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
					type="button"
					onClick={onClick}
					aria-pressed={active}
					aria-label={label}
					data-testid={testId}
					className={cn(
						"flex size-8 items-center justify-center rounded-full border transition-colors",
						active
							? activeClass
							: "border-border text-muted-foreground hover:bg-muted",
					)}
				>
					<Icon className="size-4" />
				</button>
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
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
	const [expenseFilter, setExpenseFilter] = useState<ExpenseFilter>("all");
	const [expenseSort, setExpenseSort] = useState<ExpenseSort>("manual");
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
		<form.Field name={name} mode="array">
			{(field) => (
				<div className="space-y-2">
					{field.state.value.map((_row, index) =>
						withVat ? (
							<form.Subscribe
								key={index}
								selector={(s) => s.values[name][index]}
							>
								{(row) => {
									const dueDate = row?.dueDate ?? "";
									const paid = !!row?.paid;
									const ordered = !!row?.ordered;
									const overdue = !!dueDate && dueDate < todayISO && !paid;
									const days = dueDate
										? Math.round(
												(Date.parse(dueDate) - Date.parse(todayISO)) /
													86_400_000,
											)
										: null;
									const accent = overdue
										? "border-l-destructive"
										: paid
											? "border-l-emerald-500"
											: ordered
												? "border-l-amber-500"
												: "border-l-transparent";
									const hiddenByFilter =
										(expenseFilter === "unpaid" && paid) ||
										(expenseFilter === "overdue" && !overdue) ||
										(expenseFilter === "paid" && !paid);
									return (
										<div
											className={cn(
												"space-y-2 rounded-lg border border-l-4 p-3 transition-colors",
												accent,
												overdue
													? "bg-destructive/5"
													: "bg-card hover:border-muted-foreground/30",
												hiddenByFilter && "hidden",
											)}
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
													{(sub) => {
														const c = (sub.state.value ?? "").trim();
														return (
															<div className="flex items-center gap-1.5">
																<span
																	className={cn(
																		"flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold uppercase text-white",
																		c
																			? avatarColor(c)
																			: "bg-muted text-muted-foreground",
																	)}
																	aria-hidden
																>
																	{c ? c[0] : "?"}
																</span>
																<Input
																	type="text"
																	list={contractorListId}
																	value={sub.state.value ?? ""}
																	placeholder="Contractor"
																	onChange={(e) =>
																		sub.handleChange(e.target.value)
																	}
																	onBlur={() => {
																		sub.handleBlur();
																		void rememberContractor(
																			sub.state.value ?? "",
																		);
																	}}
																	data-testid={`${testIdPrefix}-contractor-${index}`}
																	className="w-40"
																/>
															</div>
														);
													}}
												</form.Field>
												<form.Field name={`${name}[${index}].ordered`}>
													{(sub) => (
														<StatusChip
															active={sub.state.value}
															label="Ordered"
															icon={IconShoppingCart}
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
															icon={IconCash}
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

											<div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t pt-2">
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
															<>
																<span className="flex items-center gap-1.5 text-xs text-muted-foreground">
																	Netto
																	<FormulaInput
																		value={
																			isGross
																				? fmtEditable(netVal)
																				: (current?.amountExpr ?? "")
																		}
																		onValueChange={(v) => setSource(v, false)}
																		evaluate={evalAmount}
																		format={(n) => formatCurrency(n, currency)}
																		showResult={!isGross}
																		placeholder="0.00"
																		data-testid={`${testIdPrefix}-net-${index}`}
																		resultTestId={`${testIdPrefix}-net-eval-${index}`}
																		inputClassName={cn(
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
																			<SelectItem value="none">
																				No VAT
																			</SelectItem>
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
																	<FormulaInput
																		value={
																			isGross
																				? (current?.amountExpr ?? "")
																				: fmtEditable(grossVal)
																		}
																		onValueChange={(v) => setSource(v, true)}
																		evaluate={evalAmount}
																		format={(n) => formatCurrency(n, currency)}
																		showResult={isGross}
																		placeholder="0.00"
																		data-testid={`${testIdPrefix}-gross-${index}`}
																		resultTestId={`${testIdPrefix}-gross-eval-${index}`}
																		inputClassName={cn(
																			"font-semibold",
																			!isGross && "text-muted-foreground",
																		)}
																	/>
																</span>
															</>
														);
													}}
												</form.Subscribe>
												<span
													className={cn(
														"ml-auto flex items-center gap-1.5 text-xs",
														overdue
															? "text-destructive"
															: "text-muted-foreground",
													)}
												>
													Due
													<form.Field name={`${name}[${index}].dueDate`}>
														{(sub) => (
															<Input
																type="date"
																value={sub.state.value ?? ""}
																onChange={(e) =>
																	sub.handleChange(e.target.value)
																}
																data-testid={`${testIdPrefix}-due-${index}`}
																className={cn(
																	"w-40",
																	overdue &&
																		"border-destructive text-destructive",
																)}
															/>
														)}
													</form.Field>
													{days !== null &&
														(overdue ? (
															<span
																className="rounded bg-destructive px-1.5 py-0.5 font-medium text-white"
																data-testid={`${testIdPrefix}-overdue-${index}`}
															>
																{Math.abs(days)}d overdue
															</span>
														) : days === 0 && !paid ? (
															<span className="font-medium text-amber-600">
																due today
															</span>
														) : !paid && days > 0 && days <= 7 ? (
															<span>in {days}d</span>
														) : null)}
												</span>
											</div>
										</div>
									);
								}}
							</form.Subscribe>
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

	const renderExpenseToolbar = () => (
		<form.Subscribe selector={(s) => s.values.expenses}>
			{(rows) => {
				const g = (r: FinanceRowValue) => grossAmount(r);
				const acc = {
					unpaid: 0,
					unpaidSum: 0,
					overdue: 0,
					overdueSum: 0,
					paid: 0,
					paidSum: 0,
				};
				for (const r of rows) {
					if (r.paid) {
						acc.paid++;
						acc.paidSum += g(r);
					} else {
						acc.unpaid++;
						acc.unpaidSum += g(r);
						if (r.dueDate && r.dueDate < todayISO) {
							acc.overdue++;
							acc.overdueSum += g(r);
						}
					}
				}
				const chip = (
					key: ExpenseFilter,
					label: string,
					count: number,
					sum: number,
					activeClass: string,
				) => (
					<button
						type="button"
						onClick={() => setExpenseFilter(key)}
						data-testid={`expense-filter-${key}`}
						className={cn(
							"rounded-md border px-2.5 py-1 text-xs transition-colors",
							expenseFilter === key
								? activeClass
								: "border-border text-muted-foreground hover:bg-muted",
						)}
					>
						{label} <span className="font-medium tabular-nums">{count}</span>
						{sum ? ` · ${formatCurrency(sum, currency)}` : ""}
					</button>
				);
				return (
					<div className="flex flex-wrap items-center gap-2">
						{chip(
							"all",
							"All",
							rows.length,
							rows.reduce((s, r) => s + g(r), 0),
							"border-transparent bg-foreground text-background",
						)}
						{chip(
							"unpaid",
							"Unpaid",
							acc.unpaid,
							acc.unpaidSum,
							"border-transparent bg-amber-500 text-white",
						)}
						{chip(
							"overdue",
							"Overdue",
							acc.overdue,
							acc.overdueSum,
							"border-transparent bg-destructive text-white",
						)}
						{chip(
							"paid",
							"Paid",
							acc.paid,
							acc.paidSum,
							"border-transparent bg-emerald-600 text-white",
						)}
						<div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
							Sort
							<Select
								value={expenseSort}
								onValueChange={(v) => {
									const sort = v as ExpenseSort;
									setExpenseSort(sort);
									if (sort !== "manual") {
										form.setFieldValue(
											"expenses",
											[...rows].sort(expenseComparator(sort)),
										);
									}
								}}
							>
								<SelectTrigger className="w-32" data-testid="expense-sort">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="manual">Manual</SelectItem>
									<SelectItem value="due">Due date</SelectItem>
									<SelectItem value="amount">Amount</SelectItem>
									<SelectItem value="name">Name</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				);
			}}
		</form.Subscribe>
	);

	return (
		<TooltipProvider>
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
						<div className="space-y-3">
							{renderExpenseToolbar()}
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
						icon={IconTrendingUp}
						title="Income"
						action={
							<Tabs
								value={mode}
								onValueChange={(value) => setMode(value as Mode)}
							>
								<TabsList>
									<TabsTrigger
										value="actual"
										data-testid="finances-mode-actual"
									>
										Actual
									</TabsTrigger>
									<TabsTrigger value="sim" data-testid="finances-mode-sim">
										Simulation
									</TabsTrigger>
								</TabsList>
							</Tabs>
						}
					>
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
		</TooltipProvider>
	);
}
