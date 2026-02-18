import { IconEdit, IconLoader2, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { deleteTrackFn, updateTrackFn } from "@/utils/tracks.functions";
import type { TrackWithStats } from "@/utils/tracks.server";

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
			const message =
				error instanceof Error ? error.message : "Failed to delete track";
			toast.error(message);
		} finally {
			setDeletingId(null);
		}
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
		} finally {
			setTogglingId(null);
		}
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
									onCheckedChange={() =>
										handleToggleActive(track.id, track.isActive)
									}
									disabled={togglingId === track.id}
								/>
							</TableCell>
							<TableCell className="text-right">
								<div className="flex justify-end gap-2">
									{confirmDeleteId === track.id ? (
										<>
											<Button
												variant="destructive"
												size="sm"
												onClick={handleDeleteConfirm}
												disabled={deletingId === track.id}
											>
												{deletingId === track.id ? (
													<IconLoader2 className="mr-1 size-4 animate-spin" />
												) : null}
												Confirm
											</Button>
											<Button
												variant="outline"
												size="sm"
												onClick={() => setConfirmDeleteId(null)}
											>
												Cancel
											</Button>
										</>
									) : (
										<>
											<Button
												variant="ghost"
												size="icon"
												onClick={() => onEdit(track)}
												aria-label="Edit"
											>
												<IconEdit className="size-4" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												onClick={() =>
													handleDeleteClick(track.id, track.submissionCount)
												}
												disabled={
													track.submissionCount > 0 || deletingId === track.id
												}
												aria-label="Delete"
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
