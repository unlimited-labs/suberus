import { IconLoader2 } from "@tabler/icons-react";

interface ExtractionOverlayProps {
	isExtracting: boolean;
	elapsedSeconds: number;
}

export function ExtractionOverlay({
	isExtracting,
	elapsedSeconds,
}: ExtractionOverlayProps) {
	if (!isExtracting) return null;

	return (
		<div
			aria-label="Extracting metadata from document"
			className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm"
			data-testid="extraction-overlay"
			role="status"
		>
			<div className="flex flex-col items-center gap-3">
				<IconLoader2 className="size-8 animate-spin text-primary" />
				<div className="text-center">
					<p className="text-sm font-medium">Extracting metadata...</p>
					<p
						className="text-xs text-muted-foreground"
						data-testid="extraction-elapsed"
					>
						{elapsedSeconds}s
					</p>
					{elapsedSeconds >= 10 ? (
						<p className="mt-1 text-xs text-muted-foreground">
							Extraction is taking longer than usual...
						</p>
					) : null}
				</div>
			</div>
		</div>
	);
}
