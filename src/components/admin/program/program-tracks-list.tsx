import { Badge } from "@/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { ProgramTrackWithStats } from "@/lib/server/planner/tracks";
import { deleteProgramTrackFn } from "@/server-fns/planner/tracks";
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
								key={track.id}
								data-testid={`program-track-row-${track.id}`}
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
										<Badge variant="outline" className="font-mono">
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
										isBusy={isBusy}
										isConfirming={confirmId === track.id}
										deleteDisabled={track.sessionCount > 0}
										onEdit={() => onEdit(track)}
										onAskDelete={() => askDelete(track.id)}
										onConfirmDelete={() => remove(track.id)}
										onCancelDelete={cancelDelete}
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
