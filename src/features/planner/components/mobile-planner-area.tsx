import { useState } from "react";
import { MobilePlanner } from "@/features/planner/components/mobile-planner";

interface MobilePlannerAreaProps
	extends Omit<React.ComponentProps<typeof MobilePlanner>, "initialDate"> {
	currentDate: Date | null;
}

/**
 * Mobile planner column. Owns the initial-date fallback (viewed date →
 * conference start → today) so the route shell stays free of it.
 */
export function MobilePlannerArea({
	currentDate,
	...props
}: MobilePlannerAreaProps) {
	const [today] = useState(() => new Date());
	return (
		<div className="flex min-h-0 flex-1 md:hidden">
			<div className="flex-1 overflow-auto">
				<MobilePlanner
					{...props}
					initialDate={currentDate ?? props.conferenceStart ?? today}
				/>
			</div>
		</div>
	);
}
