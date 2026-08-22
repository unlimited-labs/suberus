export type DeadlineVariant = "completed" | "overdue" | "urgent" | "normal";

export interface DeadlineDisplay {
	variant: DeadlineVariant;
	label: string;
}

export function getDeadlineDisplay(
	status: string,
	daysRemaining: number | null,
	dateStr: string | undefined,
): DeadlineDisplay {
	if (status === "COMPLETED") {
		return { variant: "completed", label: `Completed on ${dateStr}` };
	}

	const isPast = daysRemaining !== null && daysRemaining < 0;
	if (isPast || status === "OVERDUE") {
		const overdueDays = daysRemaining !== null ? Math.abs(daysRemaining) : 0;
		return {
			variant: "overdue",
			label: `${overdueDays}d overdue (${dateStr})`,
		};
	}

	const isUrgent =
		daysRemaining !== null && daysRemaining <= 3 && daysRemaining >= 0;
	return {
		variant: isUrgent ? "urgent" : "normal",
		label: `${daysRemaining}d left (${dateStr})`,
	};
}
