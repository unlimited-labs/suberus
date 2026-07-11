import { IconUsers } from "@tabler/icons-react";

type Chair = { firstName: string | null; lastName: string | null };

function initials(
	first: string | null | undefined,
	last: string | null | undefined,
): string {
	const a = (first ?? "").trim()[0] ?? "";
	const b = (last ?? "").trim()[0] ?? "";
	return `${a}${b}`.toUpperCase() || "?";
}

export function ChairStack({ chairs }: { chairs: Chair[] }) {
	if (chairs.length === 0) {
		return (
			<span
				className="inline-flex shrink-0 items-center gap-0.5 text-[9px] text-amber-600 dark:text-amber-400"
				title="No chair assigned"
			>
				<IconUsers className="size-3" />!
			</span>
		);
	}
	const seen = new Map<string, number>();
	return (
		<div className="flex shrink-0 -space-x-1">
			{chairs.slice(0, 3).map((c) => {
				const name = `${c.firstName}-${c.lastName}`;
				const dup = seen.get(name) ?? 0;
				seen.set(name, dup + 1);
				return (
					<span
						key={dup ? `${name}-${dup}` : name}
						className="inline-flex size-5 items-center justify-center rounded-full border border-background bg-muted text-[9px] font-semibold text-muted-foreground"
						title={`${c.firstName ?? ""} ${c.lastName ?? ""}`.trim()}
					>
						{initials(c.firstName, c.lastName)}
					</span>
				);
			})}
		</div>
	);
}
