import { evalAmount } from "@/features/finances/calc";
import { formatCurrency } from "@/shared/lib/format-currency";
import { cn } from "@/shared/lib/utils";
import { FormulaInput } from "@/shared/ui/formula-input";

const LABEL_CLS =
	"text-[10px] font-medium uppercase tracking-wide text-muted-foreground";

export function MoneyCells({
	netValue,
	grossValue,
	showNetResult,
	showGrossResult,
	vat,
	vatRates,
	vatAmount,
	currency,
	testIdPrefix,
	index,
	onNetChange,
	onGrossChange,
	onVatChange,
}: {
	netValue: string;
	grossValue: string;
	showNetResult: boolean;
	showGrossResult: boolean;
	vat: number | null;
	vatRates: Array<{ id: string; rate: number }>;
	vatAmount: number;
	currency: string;
	testIdPrefix: string;
	index: number;
	onNetChange: (value: string) => void;
	onGrossChange: (value: string) => void;
	onVatChange: (rate: number | null) => void;
}) {
	const fmt = (n: number) => formatCurrency(n, currency);
	return (
		<>
			<div className="flex flex-col gap-1">
				<span className={LABEL_CLS}>Netto</span>
				<FormulaInput
					value={netValue}
					onValueChange={onNetChange}
					evaluate={evalAmount}
					format={fmt}
					showResult={showNetResult}
					placeholder="0.00"
					data-testid={`${testIdPrefix}-net-${index}`}
					resultTestId={`${testIdPrefix}-net-eval-${index}`}
					inputClassName={cn(!showNetResult && "text-muted-foreground")}
				/>
			</div>
			<div className="flex flex-col gap-1">
				<span className={LABEL_CLS}>VAT</span>
				<div className="inline-flex h-8 items-center gap-0.5 rounded-md border p-0.5">
					{[null, ...vatRates.map((r) => r.rate)].map((rate) => (
						<button
							key={rate ?? "none"}
							type="button"
							aria-pressed={vat === rate}
							onClick={() => onVatChange(rate)}
							data-testid={`${testIdPrefix}-vat-${rate ?? "none"}-${index}`}
							className={cn(
								"rounded px-2 py-0.5 text-xs tabular-nums transition-colors",
								vat === rate
									? "bg-foreground text-background"
									: "text-muted-foreground hover:bg-muted",
							)}
						>
							{rate === null ? "—" : `${rate}%`}
						</button>
					))}
				</div>
			</div>
			<div className="flex flex-col gap-0.5">
				<span className={LABEL_CLS}>Gross</span>
				<FormulaInput
					value={grossValue}
					onValueChange={onGrossChange}
					evaluate={evalAmount}
					format={fmt}
					showResult={showGrossResult}
					placeholder="0.00"
					data-testid={`${testIdPrefix}-gross-${index}`}
					resultTestId={`${testIdPrefix}-gross-eval-${index}`}
					inputClassName={cn(
						"font-semibold",
						!showGrossResult && "text-muted-foreground",
					)}
				/>
				{vat ? (
					<span
						className="self-end text-[10px] text-muted-foreground"
						data-testid={`${testIdPrefix}-vatamt-${index}`}
					>
						incl. {fmt(vatAmount)} VAT
					</span>
				) : null}
			</div>
		</>
	);
}
