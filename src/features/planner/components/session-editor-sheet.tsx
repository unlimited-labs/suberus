import { useRef } from "react";
import { Sheet, SheetContent, SheetDescription } from "@/shared/ui/sheet";
import { ChairsSection } from "./session-editor/chairs-section";
import { PresentationsSection } from "./session-editor/presentations-section";
import { SessionEditorProvider } from "./session-editor/session-editor-context";
import { SessionEditorFooter } from "./session-editor/session-editor-footer";
import { SessionEditorHeader } from "./session-editor/session-editor-header";
import type { ChairCandidate } from "./types";

interface SessionEditorSheetProps {
	sessionId: string | null;
	onClose: () => void;
	users: ChairCandidate[];
}

export function SessionEditorSheet({
	sessionId,
	onClose,
	users,
}: SessionEditorSheetProps) {
	const dirtyRef = useRef(false);
	const requestClose = () => {
		if (dirtyRef.current && !window.confirm("Discard unsaved changes?")) return;
		onClose();
	};
	return (
		<Sheet
			open={sessionId !== null}
			onOpenChange={(open) => !open && requestClose()}
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
						users={users}
						dirtyRef={dirtyRef}
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
