import { IconRefresh } from "@tabler/icons-react";
import { useVersionPoll } from "@/shared/hooks/use-version-poll";
import { useVersionSkew } from "@/shared/lib/version-skew";
import { Button } from "@/shared/ui/button";

/**
 * Fixed bottom banner shown when the backend has been redeployed under an open
 * tab (detected via polling or a server-fn response). Prompts a manual refresh
 * so unsaved form data isn't lost. Mount inside the authenticated layout.
 */
export function VersionSkewBanner() {
	useVersionPoll();
	const skewed = useVersionSkew();

	if (!skewed) return null;

	return (
		<div
			className="fixed inset-x-0 bottom-0 z-[9998] flex flex-col items-center justify-center gap-2 border-t bg-background/95 px-4 py-3 text-center shadow-lg backdrop-blur sm:flex-row sm:gap-4"
			data-testid="version-skew-banner"
			role="alert"
		>
			<p className="text-sm text-foreground">
				A new version of the app is available. Refresh to avoid errors.
			</p>
			<Button
				data-testid="version-skew-reload"
				onClick={() => window.location.reload()}
				size="sm"
			>
				<IconRefresh />
				Refresh
			</Button>
		</div>
	);
}
