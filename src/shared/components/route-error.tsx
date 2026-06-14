import { IconAlertTriangle } from "@tabler/icons-react";
import { useRouter } from "@tanstack/react-router";
import { Button } from "@/shared/ui/button";

export function RouteError() {
	const router = useRouter();

	return (
		<div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
			<IconAlertTriangle className="size-12 text-destructive" />
			<p className="text-lg font-medium text-foreground">
				Something went wrong
			</p>
			<p className="text-sm">An error occurred while loading this page.</p>
			<Button variant="outline" onClick={() => router.invalidate()}>
				Try again
			</Button>
		</div>
	);
}
