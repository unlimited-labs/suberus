import { deleteProgramTrackFn } from "@/features/planner/api/tracks";
import type { ProgramTrackWithStats } from "@/features/planner/server/tracks";
import { Badge } from "@/shared/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/ui/table";
import { RowActions } from "./row-actions";
import { useConfirmDelete } from "./use-confirm-delete";

interface ProgramTracksListProps {
	tracks: ProgramTrackWithStats[];
	onEdit: (track: ProgramTrackWithStats) => void;
	onUpdate: () => void;
}

export function ProgramTracksList({
	tracks,
	onEdit,
	onUpdate,
}: ProgramTracksListProps) {
	const { pendingId, confirmId, askDelete, cancelDelete, remove } =
		useConfirmDelete({
			onDelete: (id) => deleteProgramTrackFn({ data: { id } }),
			successMessage: "Program track deleted",
			fallbackErrorMessage: "Failed to delete track",
			onMutated: onUpdate,
		});

	if (tracks.length === 0) {
		return (
			<div className="flex min-h-[160px] items-center justify-center rounded-md border border-dashed">
				<p className="text-sm text-muted-foreground">
					No program tracks yet. Create one to color-code the planner.
				</p>
			</div>
		);
	}

	return (
		<div
			className="overflow-x-auto rounded-md border"
			data-testid="program-tracks-list"
		>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-10" />
						<TableHead>Name</TableHead>
						<TableHead>Series</TableHead>
						<TableHead className="text-center">Sessions</TableHead>
						<TableHead className="text-right">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{tracks.map((track) => {
						const isBusy = pendingId === track.id;
						return (
							<TableRow
								data-testid={`program-track-row-${track.id}`}
								key={track.id}
							>
								<TableCell>
									<span
										className="inline-block size-5 rounded-full border"
										style={{
											backgroundColor: track.color ?? "transparent",
											borderColor: track.color
												? "transparent"
												: "var(--border)",
										}}
										title={track.color ?? "no color"}
									/>
								</TableCell>
								<TableCell className="font-medium">{track.name}</TableCell>
								<TableCell>
									{track.series ? (
										<Badge className="font-mono" variant="outline">
											{track.series} · #{track.seriesOrder}
										</Badge>
									) : (
										<span className="text-xs text-muted-foreground">—</span>
									)}
								</TableCell>
								<TableCell className="text-center">
									<Badge variant="secondary">{track.sessionCount}</Badge>
								</TableCell>
								<TableCell className="text-right">
									<RowActions
										deleteDisabled={track.sessionCount > 0}
										isBusy={isBusy}
										isConfirming={confirmId === track.id}
										onAskDelete={() => askDelete(track.id)}
										onCancelDelete={cancelDelete}
										onConfirmDelete={() => remove(track.id)}
										onEdit={() => onEdit(track)}
										testIdPrefix="program-track"
									/>
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</div>
	);
}
