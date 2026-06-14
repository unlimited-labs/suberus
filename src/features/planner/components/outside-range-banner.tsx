import { IconAlertTriangle } from "@tabler/icons-react";

interface Props {
	onReturn: (() => void) | null;
}

export function OutsideRangeBanner({ onReturn }: Props) {
	return (
		<div className="flex items-center gap-2 border-b bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
			<IconAlertTriangle size={13} className="shrink-0" />
			Outside conference dates
			{onReturn && (
				<button
					type="button"
					className="ml-auto underline hover:no-underline"
					onClick={onReturn}
				>
					Return
				</button>
			)}
		</div>
	);
}
