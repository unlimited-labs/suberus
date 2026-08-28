import type { ProgramBadge } from "@/features/settings/types";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";

export function readableTextOn(hex: string): "#000000" | "#ffffff" {
	const channel = (offset: number) => {
		const c = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	};
	const luminance =
		0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
	// 0.179 = WCAG crossover luminance where black text beats white.
	return luminance > 0.179 ? "#000000" : "#ffffff";
}

export function PresentationBadge({
	badge,
	className,
}: {
	badge: ProgramBadge;
	className?: string;
}) {
	const colors = {
		backgroundColor: badge.color,
		color: readableTextOn(badge.color),
	};

	if (badge.style === "ribbon") {
		return (
			<span
				className={cn(
					"pointer-events-none absolute -right-7 top-1.5 w-28 truncate rotate-45 px-1 py-0.5 text-center font-(family-name:--prog-font-meta) text-[10px] leading-4 font-semibold tracking-(--prog-tracking) uppercase",
					className,
				)}
				data-testid="presentation-badge"
				style={colors}
			>
				{badge.label}
			</span>
		);
	}

	return (
		<Badge
			className={cn(
				"rounded-(--prog-badge-radius) border-transparent font-(family-name:--prog-font-meta) tracking-(--prog-tracking) uppercase",
				className,
			)}
			data-testid="presentation-badge"
			style={colors}
		>
			{badge.label}
		</Badge>
	);
}
