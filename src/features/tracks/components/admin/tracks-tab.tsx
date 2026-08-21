import { IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import type { ReviewerUser } from "@/features/reviews/server/reviewers";
import type { TrackWithStats } from "@/features/tracks/server/admin-tracks";
import { Button } from "@/shared/ui/button";
import { SectionCard } from "@/shared/ui/section-card";
import { TrackDialog } from "./track-dialog";
import { TracksList } from "./tracks-list";

interface TracksTabProps {
	initialTracks: TrackWithStats[];
	reviewers: ReviewerUser[];
	onUpdate: () => void;
}

export function TracksTab({
	initialTracks,
	reviewers,
	onUpdate,
}: TracksTabProps) {
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingTrack, setEditingTrack] = useState<TrackWithStats | null>(null);

	const handleEdit = (track: TrackWithStats) => {
		setEditingTrack(track);
		setDialogOpen(true);
	};

	const handleCloseDialog = () => {
		setDialogOpen(false);
		setEditingTrack(null);
	};

	return (
		<div className="space-y-6">
			<SectionCard
				action={
					<Button onClick={() => setDialogOpen(true)}>
						<IconPlus className="mr-2 size-4" />
						Create Track
					</Button>
				}
				description="Thematic paths that group presentations by subject area"
				title="Conference Tracks"
			>
				<TracksList
					onEdit={handleEdit}
					onUpdate={onUpdate}
					tracks={initialTracks}
				/>
			</SectionCard>

			<TrackDialog
				key={editingTrack?.id ?? "new"}
				onOpenChange={handleCloseDialog}
				onSuccess={onUpdate}
				open={dialogOpen}
				reviewers={reviewers}
				track={editingTrack || undefined}
			/>
		</div>
	);
}
