import { UnscheduledSidebar } from "@/features/planner/components/unscheduled-sidebar";

interface Props {
	onClose: () => void;
}

export function MobileQueueOverlay({ onClose }: Props) {
	return (
		<div className="fixed inset-0 z-40 flex md:hidden">
			<button
				aria-label="Close submissions panel"
				className="absolute inset-0 bg-black/40"
				onClick={onClose}
				type="button"
			/>
			<div className="bg-background relative ml-auto flex size-full max-w-sm shadow-xl">
				<UnscheduledSidebar />
			</div>
		</div>
	);
}
