import type { Icon } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

interface PanelProps {
	/** Optional header label. When omitted, the panel renders content only. */
	title?: string;
	icon?: Icon;
	/** `outlined` = bordered side panel; `elevated` = prominent main panel. */
	variant?: "outlined" | "elevated";
	className?: string;
	children: ReactNode;
}

/**
 * Card-like surface used across form/detail screens (rounded-2xl + shadow).
 * `outlined` matches the bordered side panels; `elevated` matches the main
 * content panel.
 */
export function Panel({
	title,
	icon: PanelIcon,
	variant = "outlined",
	className,
	children,
}: PanelProps) {
	return (
		<div
			className={cn(
				"rounded-2xl bg-card",
				variant === "elevated"
					? "overflow-hidden shadow-2xl"
					: "border border-border/50 p-6 shadow-xl",
				className,
			)}
		>
			{title ? (
				<div className="mb-4 flex items-center gap-2">
					{PanelIcon ? (
						<PanelIcon className="size-5 text-muted-foreground" />
					) : null}
					<h3 className="font-semibold text-foreground">{title}</h3>
				</div>
			) : null}
			{children}
		</div>
	);
}
