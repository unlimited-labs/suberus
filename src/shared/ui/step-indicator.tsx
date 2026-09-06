import { IconCheck } from "@tabler/icons-react";
import { cn } from "@/shared/lib/utils";

export interface Step {
	id: number;
	title: string;
}

interface StepIndicatorProps {
	steps: readonly Step[];
	currentStep: number;
	orientation?: "vertical" | "horizontal";
	/** `onPrimary` for a coloured panel, where the palette is inverted. */
	tone?: "default" | "onPrimary";
	className?: string;
}

const CIRCLE = {
	default: {
		done: "border-primary bg-primary text-primary-foreground",
		current: "border-primary text-primary-ink",
		upcoming: "border-muted-foreground/40 text-muted-foreground",
	},
	onPrimary: {
		done: "border-primary-foreground bg-primary-foreground text-primary-ink",
		current: "border-primary-foreground bg-transparent",
		upcoming: "border-primary-foreground/50 bg-transparent",
	},
} as const;

export function StepIndicator({
	steps,
	currentStep,
	orientation = "vertical",
	tone = "default",
	className,
}: StepIndicatorProps) {
	const horizontal = orientation === "horizontal";

	return (
		<ol
			className={cn(
				horizontal ? "flex items-center gap-2" : "space-y-2",
				className,
			)}
		>
			{steps.map((step, index) => {
				const state =
					step.id < currentStep
						? "done"
						: step.id === currentStep
							? "current"
							: "upcoming";
				return (
					<li
						aria-current={state === "current" ? "step" : undefined}
						className={cn(
							"flex items-center gap-2 transition-opacity duration-300",
							horizontal && "min-w-0",
							tone === "onPrimary" && state !== "current" && "opacity-50",
						)}
						key={step.id}
					>
						<span
							className={cn(
								"flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-medium transition-all",
								CIRCLE[tone][state],
							)}
						>
							{state === "done" ? <IconCheck className="size-3" /> : step.id}
						</span>
						<span
							className={cn(
								"truncate text-xs font-medium",
								horizontal && "hidden sm:inline",
								tone === "default" &&
									state !== "current" &&
									"text-muted-foreground",
							)}
						>
							{step.title}
						</span>
						{horizontal && index < steps.length - 1 && (
							<span
								aria-hidden
								className={cn(
									"h-px w-6 shrink-0",
									tone === "onPrimary"
										? "bg-primary-foreground/40"
										: "bg-border",
								)}
							/>
						)}
					</li>
				);
			})}
		</ol>
	);
}
