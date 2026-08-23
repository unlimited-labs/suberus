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
		<div className="bg-muted flex items-center gap-0.5 rounded-md p-1">
			<button
				aria-label="Previous period"
				className={`flex size-7 items-center justify-center ${BTN}`}
				onClick={onPrev}
				type="button"
			>
				<IconChevronLeft className="size-4" />
			</button>
			<button
				className={`h-7 px-2.5 text-xs font-medium ${BTN}`}
				onClick={onToday}
				type="button"
			>
				Today
			</button>
			<button
				aria-label="Next period"
				className={`flex size-7 items-center justify-center ${BTN}`}
				onClick={onNext}
				type="button"
			>
				<IconChevronRight className="size-4" />
			</button>
		</div>
	);
}
