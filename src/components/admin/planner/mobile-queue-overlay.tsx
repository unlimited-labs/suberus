import { UnscheduledSidebar } from "@/components/admin/planner/unscheduled-sidebar";

interface Props {
	onClose: () => void;
}

export function MobileQueueOverlay({ onClose }: Props) {
	return (
		<div className="fixed inset-0 z-40 flex md:hidden">
			<button
				type="button"
				className="absolute inset-0 bg-black/40"
				onClick={onClose}
				aria-label="Close submissions panel"
			/>
			<div className="relative ml-auto flex h-full w-full max-w-sm bg-background shadow-xl">
				<UnscheduledSidebar />
			</div>
		</div>
	);
}
