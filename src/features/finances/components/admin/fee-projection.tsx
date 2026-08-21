import type { FeeProjectionRow } from "@/features/finances/calc";
import type { FeeTypeSummary } from "@/features/finances/server/finances";
import { formatCurrency } from "@/shared/lib/format-currency";
import { Input } from "@/shared/ui/input";

const parse = (raw: string) => (raw === "" ? Number.NaN : Number(raw));

export function FeeProjection({
	types,
	rows,
	currency,
	onChange,
}: {
	types: FeeTypeSummary[];
	rows: FeeProjectionRow[];
	currency: string;
	onChange: (rows: FeeProjectionRow[]) => void;
}) {
	const update = (index: number, patch: Partial<FeeProjectionRow>) => {
		onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
	};

	return (
		<div className="space-y-2 rounded-md border border-border/60 bg-muted/20 p-3">
			<div className="text-xs font-medium text-muted-foreground">
				Registration fee projection
			</div>
			{types.length === 0 ? (
				<p className="text-sm text-muted-foreground">No fee types defined.</p>
			) : (
				types.map((type, index) => {
					const row = rows[index] ?? { price: type.amount, qty: 0 };
					const line =
						(Number.isFinite(row.price) ? row.price : 0) *
						(Number.isFinite(row.qty) ? row.qty : 0);
					return (
						<div className="flex items-center gap-2" key={type.id}>
							<span className="flex-1 truncate text-sm">{type.name}</span>
							<Input
								className="w-24 text-right tabular-nums"
								data-testid={`sim-price-${index}`}
								inputMode="decimal"
								min={0}
								onChange={(e) =>
									update(index, { price: parse(e.target.value) })
								}
								step="0.01"
								type="number"
								value={Number.isFinite(row.price) ? row.price : ""}
							/>
							<span className="text-xs text-muted-foreground">×</span>
							<Input
								className="w-20 text-right tabular-nums"
								data-testid={`sim-qty-${index}`}
								inputMode="numeric"
								min={0}
								onChange={(e) => update(index, { qty: parse(e.target.value) })}
								step="1"
								type="number"
								value={Number.isFinite(row.qty) ? row.qty : ""}
							/>
							<span className="w-28 text-right text-sm tabular-nums">
								{formatCurrency(line, currency)}
							</span>
						</div>
					);
				})
			)}
		</div>
	);
}
