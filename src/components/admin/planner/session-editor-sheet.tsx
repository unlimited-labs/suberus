import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { adminUsersQueryOptions } from "@/utils/admin-users.functions";
import { allSessionsQueryOptions } from "@/utils/program-sessions.functions";
import { allProgramTracksQueryOptions } from "@/utils/program-tracks.functions";
import { allRoomsQueryOptions } from "@/utils/rooms.functions";
import { conferenceSettingsQueryOptions } from "@/utils/settings.functions";
import { ChairsSection } from "./session-editor/chairs-section";
import { PresentationsSection } from "./session-editor/presentations-section";
import { SessionEditorFooter } from "./session-editor/session-editor-footer";
import { SessionEditorHeader } from "./session-editor/session-editor-header";
import { useSessionEditorMutations } from "./session-editor/use-session-editor-mutations";
import { suggestSessionName } from "./suggest-session-name";

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
				{sessionId !== null && (
					<SessionEditorBody sessionId={sessionId} onClose={onClose} />
				)}
			</SheetContent>
		</Sheet>
	);
}

function SessionEditorBody({
	sessionId,
	onClose,
}: {
	sessionId: string;
	onClose: () => void;
}) {
	const { data: sessions } = useSuspenseQuery(allSessionsQueryOptions());
	const { data: tracks } = useSuspenseQuery(allProgramTracksQueryOptions());
	const { data: rooms } = useSuspenseQuery(allRoomsQueryOptions());
	const { data: settings } = useSuspenseQuery(conferenceSettingsQueryOptions());
	const { data: users } = useQuery(adminUsersQueryOptions());
	const tz = settings.timezone || undefined;
	const mutations = useSessionEditorMutations(sessionId);

	const session = sessions.find((s) => s.id === sessionId);

	const [title, setTitle] = useState(session?.title ?? "");
	const [titleDirty, setTitleDirty] = useState(false);
	const [deleting, setDeleting] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset local state when session changes
	useEffect(() => {
		setTitle(session?.title ?? "");
		setTitleDirty(false);
	}, [session?.id]);

	if (!session) {
		return (
			<div className="flex flex-1 items-center justify-center p-8">
				<p className="text-sm text-muted-foreground">Session not found</p>
			</div>
		);
	}

	const sortedPresentations = [...session.presentations].sort(
		(a, b) => a.order - b.order,
	);

	const sessionDurationMin = Math.round(
		(new Date(session.endAt).getTime() - new Date(session.startAt).getTime()) /
			60_000,
	);
	const usedMin = sortedPresentations.reduce((s, p) => s + p.durationMin, 0);

	const handleSaveTitle = async () => {
		if (!titleDirty) return;
		await mutations.updateTitle(title);
		setTitleDirty(false);
	};

	const handleSuggestName = () => {
		const suggestion = suggestSessionName(
			session.presentations.map((p) => ({
				id: p.submissionId,
				title: p.submissionTitle,
				type: "ABSTRACT",
				abstract: null,
				trackId: null,
				trackName: null,
				authors: p.authors,
				keywords: [],
			})),
		);
		if (suggestion && suggestion !== "Session") {
			setTitle(suggestion);
			setTitleDirty(true);
		} else {
			toast.info("No suggestion available (need common title words)");
		}
	};

	const handleDelete = async () => {
		setDeleting(true);
		const result = await mutations.deleteSession();
		setDeleting(false);
		if (result !== null) onClose();
	};

	return (
		<>
			<SessionEditorHeader
				session={session}
				title={title}
				tz={tz}
				rooms={rooms}
				tracks={tracks}
				callbacks={{
					onTitleChange: (v) => {
						setTitle(v);
						setTitleDirty(true);
					},
					onSaveTitle: handleSaveTitle,
					onTrackChange: mutations.updateTrack,
					onRoomChange: mutations.updateRoom,
					onStartChange: (v) => mutations.updateStart(v, tz, session),
					onDurationChange: (m) => mutations.updateDuration(m, session),
					onSuggestName: handleSuggestName,
				}}
			/>

			<div className="flex-1 divide-y overflow-y-auto">
				<ChairsSection
					chairs={session.chairs}
					users={users}
					onAdd={mutations.addChair}
					onRemove={mutations.removeChair}
				/>
				<PresentationsSection
					presentations={sortedPresentations}
					usedMin={usedMin}
					sessionDurationMin={sessionDurationMin}
					onRemove={mutations.removePresentation}
					onUpdateDuration={mutations.updateSlotDuration}
					onReorder={mutations.reorderPresentations}
				/>
			</div>

			<SessionEditorFooter
				presentations={sortedPresentations}
				deleting={deleting}
				onContinueSeries={mutations.continueSeries}
				onSplit={mutations.split}
				onDelete={handleDelete}
			/>
		</>
	);
}
