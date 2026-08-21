import { IconAlertTriangle } from "@tabler/icons-react";
import { useRouter } from "@tanstack/react-router";
import { Button } from "@/shared/ui/button";

export function RouteError() {
	const router = useRouter();

	return (
		<div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-4">
			<IconAlertTriangle className="text-destructive size-12" />
			<p className="text-foreground text-lg font-medium">
				Something went wrong
			</p>
			<p className="text-sm">An error occurred while loading this page.</p>
			<Button onClick={() => router.invalidate()} variant="outline">
				Try again
			</Button>
		</div>
	);
}
