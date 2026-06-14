import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

interface Props {
	onPrev: () => void;
	onNext: () => void;
	onToday: () => void;
}

const BTN =
	"rounded text-muted-foreground transition-colors hover:bg-background hover:text-foreground hover:shadow-sm";

export function CalendarNavGroup({ onPrev, onNext, onToday }: Props) {
	return (
		<div className="flex items-center gap-0.5 rounded-md bg-muted p-1">
			<button
				type="button"
				onClick={onPrev}
				aria-label="Previous period"
				className={`flex size-7 items-center justify-center ${BTN}`}
			>
				<IconChevronLeft className="h-4 w-4" />
			</button>
			<button
				type="button"
				onClick={onToday}
				className={`h-7 px-2.5 text-xs font-medium ${BTN}`}
			>
				Today
			</button>
			<button
				type="button"
				onClick={onNext}
				aria-label="Next period"
				className={`flex size-7 items-center justify-center ${BTN}`}
			>
				<IconChevronRight className="h-4 w-4" />
			</button>
		</div>
	);
}
