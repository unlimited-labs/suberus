import { type ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

interface TimelineProps {
	children: ReactNode;
	className?: string;
}

export function Timeline({ children, className }: TimelineProps) {
	return (
		<div className={cn("relative space-y-4", className)} role="list">
			{children}
		</div>
	);
}

interface TimelineItemProps {
	children: ReactNode;
	className?: string;
	isLast?: boolean;
}

export function TimelineItem({
	children,
	className,
	isLast = false,
}: TimelineItemProps) {
	return (
		<div className={cn("relative flex gap-4", className)} role="listitem">
			{/* Vertical connecting line */}
			{!isLast && (
				<div className="absolute left-[11px] top-6 bottom-0 w-[2px] bg-border" />
			)}
			{children}
		</div>
	);
}

interface TimelineIndicatorProps {
	color?:
		| "blue"
		| "orange"
		| "purple"
		| "green"
		| "red"
		| "yellow"
		| "gray"
		| "default";
	icon?: ReactNode;
	className?: string;
}

export function TimelineIndicator({
	color = "default",
	icon,
	className,
}: TimelineIndicatorProps) {
	const colorClasses = {
		blue: "bg-blue-500 border-blue-500 ring-blue-500/20",
		orange: "bg-orange-500 border-orange-500 ring-orange-500/20",
		purple: "bg-purple-500 border-purple-500 ring-purple-500/20",
		green: "bg-green-500 border-green-500 ring-green-500/20",
		red: "bg-red-500 border-red-500 ring-red-500/20",
		yellow: "bg-yellow-500 border-yellow-500 ring-yellow-500/20",
		gray: "bg-gray-500 border-gray-500 ring-gray-500/20",
		default: "bg-primary border-primary ring-primary/20",
	};

	return (
		<div className="relative flex-shrink-0 z-10">
			<div
				className={cn(
					"flex items-center justify-center size-6 rounded-full border-2 ring-4",
					colorClasses[color],
					className,
				)}
			>
				{icon && (
					<div className="flex items-center justify-center text-primary-foreground">
						{icon}
					</div>
				)}
			</div>
		</div>
	);
}

interface TimelineContentProps {
	children: ReactNode;
	className?: string;
}

export function TimelineContent({ children, className }: TimelineContentProps) {
	return (
		<div className={cn("flex-1 min-w-0 pb-4", className)}>{children}</div>
	);
}
