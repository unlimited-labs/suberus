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
				title="Conference Tracks"
				description="Thematic paths that group presentations by subject area"
				action={
					<Button onClick={() => setDialogOpen(true)}>
						<IconPlus className="mr-2 size-4" />
						Create Track
					</Button>
				}
			>
				<TracksList
					tracks={initialTracks}
					onEdit={handleEdit}
					onUpdate={onUpdate}
				/>
			</SectionCard>

			<TrackDialog
				key={editingTrack?.id ?? "new"}
				open={dialogOpen}
				onOpenChange={handleCloseDialog}
				track={editingTrack || undefined}
				reviewers={reviewers}
				onSuccess={onUpdate}
			/>
		</div>
	);
}
