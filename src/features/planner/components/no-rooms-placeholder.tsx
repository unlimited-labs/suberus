import { IconCalendar } from "@tabler/icons-react";
import { PageHeader } from "@/shared/components/layout/page-header";

export function NoRoomsPlaceholder() {
	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconCalendar} title="Program Planner" />
			<div className="flex flex-1 items-center justify-center p-8">
				<div className="max-w-md rounded-md border border-dashed p-8 text-center">
					<p className="text-muted-foreground text-sm">
						No rooms configured. Add rooms in Settings → Program before using
						the planner.
					</p>
				</div>
			</div>
		</div>
	);
}
