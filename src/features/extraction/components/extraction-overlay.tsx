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
			className="bg-background/80 absolute inset-0 z-10 flex items-center justify-center rounded-lg backdrop-blur-sm"
			data-testid="extraction-overlay"
			role="status"
		>
			<div className="flex flex-col items-center gap-3">
				<IconLoader2 className="text-primary size-8 animate-spin" />
				<div className="text-center">
					<p className="text-sm font-medium">Extracting metadata...</p>
					<p
						className="text-muted-foreground text-xs"
						data-testid="extraction-elapsed"
					>
						{elapsedSeconds}s
					</p>
					{elapsedSeconds >= 10 ? (
						<p className="text-muted-foreground mt-1 text-xs">
							Extraction is taking longer than usual...
						</p>
					) : null}
				</div>
			</div>
		</div>
	);
}
