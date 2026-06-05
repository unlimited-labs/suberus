import { Sheet, SheetContent, SheetDescription } from "@/components/ui/sheet";
import { ChairsSection } from "./session-editor/chairs-section";
import { PresentationsSection } from "./session-editor/presentations-section";
import { SessionEditorProvider } from "./session-editor/session-editor-context";
import { SessionEditorFooter } from "./session-editor/session-editor-footer";
import { SessionEditorHeader } from "./session-editor/session-editor-header";

interface SessionEditorSheetProps {
	sessionId: string | null;
	onClose: () => void;
}

export function SessionEditorSheet({
	sessionId,
	onClose,
}: SessionEditorSheetProps) {
	return (
		<Sheet
			open={sessionId !== null}
			onOpenChange={(open) => !open && onClose()}
		>
			<SheetContent
				side="right"
				data-testid="session-editor"
				className="flex flex-col gap-0 p-0 sm:max-w-md"
			>
				<SheetDescription className="sr-only">
					Edit the session's details, chairs and presentations.
				</SheetDescription>
				{sessionId !== null && (
					<SessionEditorProvider
						sessionId={sessionId}
						onClose={onClose}
						fallback={
							<div className="flex flex-1 items-center justify-center p-8">
								<p className="text-sm text-muted-foreground">
									Session not found
								</p>
							</div>
						}
					>
						<SessionEditorHeader />
						<div className="flex-1 divide-y overflow-y-auto">
							<ChairsSection />
							<PresentationsSection />
						</div>
						<SessionEditorFooter />
					</SessionEditorProvider>
				)}
			</SheetContent>
		</Sheet>
	);
}
