import { IconEdit, IconLoader2, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import {
	deleteTrackFn,
	updateTrackFn,
} from "@/features/tracks/api/admin-tracks";
import type { TrackWithStats } from "@/features/tracks/server/admin-tracks";
import { getErrorMessage } from "@/shared/lib/error-message";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Switch } from "@/shared/ui/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/ui/table";

interface TracksListProps {
	tracks: TrackWithStats[];
	onEdit: (track: TrackWithStats) => void;
	onUpdate: () => void;
}

export function TracksList({ tracks, onEdit, onUpdate }: TracksListProps) {
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [togglingId, setTogglingId] = useState<string | null>(null);

	const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

	const handleDeleteClick = (id: string, submissionCount: number) => {
		if (submissionCount > 0) {
			toast.error(`Cannot delete track with ${submissionCount} submission(s)`);
			return;
		}
		setConfirmDeleteId(id);
	};

	const handleDeleteConfirm = async () => {
		if (!confirmDeleteId) return;
		setDeletingId(confirmDeleteId);
		setConfirmDeleteId(null);
		try {
			await deleteTrackFn({ data: { id: confirmDeleteId } });
			toast.success("Track deleted");
			onUpdate();
		} catch (error) {
			toast.error(getErrorMessage(error, "Failed to delete track"));
		}
		setDeletingId(null);
	};

	const handleToggleActive = async (id: string, currentActive: boolean) => {
		setTogglingId(id);
		try {
			await updateTrackFn({
				data: {
					id,
					isActive: !currentActive,
				},
			});
			toast.success(`Track ${!currentActive ? "activated" : "deactivated"}`);
			onUpdate();
		} catch (_error) {
			toast.error("Failed to update track");
		}
		setTogglingId(null);
	};

	if (tracks.length === 0) {
		return (
			<div className="flex min-h-[200px] items-center justify-center rounded-md border border-dashed">
				<p className="text-sm text-muted-foreground">
					No tracks yet. Create your first track.
				</p>
			</div>
		);
	}

	return (
		<div className="overflow-x-auto rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Name</TableHead>
						<TableHead>Supervisor</TableHead>
						<TableHead className="text-center">Submissions</TableHead>
						<TableHead className="text-center">Active</TableHead>
						<TableHead className="text-right">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{tracks.map((track) => (
						<TableRow key={track.id}>
							<TableCell className="font-medium">{track.name}</TableCell>
							<TableCell>
								{track.supervisorName || (
									<span className="text-muted-foreground">None</span>
								)}
							</TableCell>
							<TableCell className="text-center">
								<Badge variant="secondary">{track.submissionCount}</Badge>
							</TableCell>
							<TableCell className="text-center">
								<Switch
									checked={track.isActive}
									disabled={togglingId === track.id}
									onCheckedChange={() =>
										handleToggleActive(track.id, track.isActive)
									}
								/>
							</TableCell>
							<TableCell className="text-right">
								<div className="flex justify-end gap-2">
									{confirmDeleteId === track.id ? (
										<>
											<Button
												disabled={deletingId === track.id}
												onClick={handleDeleteConfirm}
												size="sm"
												variant="destructive"
											>
												{deletingId === track.id ? (
													<IconLoader2 className="mr-1 size-4 animate-spin" />
												) : null}
												Confirm
											</Button>
											<Button
												onClick={() => setConfirmDeleteId(null)}
												size="sm"
												variant="outline"
											>
												Cancel
											</Button>
										</>
									) : (
										<>
											<Button
												aria-label="Edit"
												onClick={() => onEdit(track)}
												size="icon"
												variant="ghost"
											>
												<IconEdit className="size-4" />
											</Button>
											<Button
												aria-label="Delete"
												disabled={
													track.submissionCount > 0 || deletingId === track.id
												}
												onClick={() =>
													handleDeleteClick(track.id, track.submissionCount)
												}
												size="icon"
												variant="ghost"
											>
												<IconTrash className="size-4" />
											</Button>
										</>
									)}
								</div>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
