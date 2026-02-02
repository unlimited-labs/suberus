import type { SubmissionStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";
import { STATUS_GRADIENTS, STATUS_LABELS } from "./constants";

interface StatusCardProps {
	status: SubmissionStatus;
	variant?: "desktop" | "mobile";
}

export function StatusCard({ status, variant = "desktop" }: StatusCardProps) {
	if (variant === "mobile") {
		return (
			<div
				className={cn(
					"inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm font-semibold bg-gradient-to-r",
					STATUS_GRADIENTS[status],
				)}
			>
				{STATUS_LABELS[status]}
			</div>
		);
	}

	return (
		<div className="relative rounded-2xl p-[2px] shadow-xl">
			<div
				className={cn(
					"absolute inset-0 rounded-2xl bg-gradient-to-br opacity-100",
					STATUS_GRADIENTS[status],
				)}
			/>
			<div className="relative rounded-[14px] bg-card p-6">
				<div className="text-center space-y-3">
					<p className="text-sm text-muted-foreground">Status</p>
					<div
						className={cn(
							"inline-flex items-center gap-2 px-4 py-2 rounded-full text-white font-semibold bg-gradient-to-r",
							STATUS_GRADIENTS[status],
						)}
					>
						{STATUS_LABELS[status]}
					</div>
				</div>
			</div>
		</div>
	);
}
