import { IconEdit, IconLoader2, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { deleteProgramTrackFn } from "@/utils/program-tracks.functions";
import type { ProgramTrackWithStats } from "@/utils/program-tracks.server";

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
	const [pendingId, setPendingId] = useState<string | null>(null);
	const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

	const handleDelete = async (id: string) => {
		setPendingId(id);
		setConfirmDeleteId(null);
		try {
			await deleteProgramTrackFn({ data: { id } });
			toast.success("Program track deleted");
			onUpdate();
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to delete track";
			toast.error(message);
		} finally {
			setPendingId(null);
		}
	};

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
		<div className="overflow-x-auto rounded-md border">
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
							<TableRow key={track.id}>
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
									<div className="flex justify-end gap-2">
										{confirmDeleteId === track.id ? (
											<>
												<Button
													variant="destructive"
													size="sm"
													onClick={() => handleDelete(track.id)}
													disabled={isBusy}
												>
													{isBusy && (
														<IconLoader2 className="mr-1 size-4 animate-spin" />
													)}
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
													onClick={() => setConfirmDeleteId(track.id)}
													disabled={isBusy || track.sessionCount > 0}
													aria-label="Delete"
												>
													<IconTrash className="size-4" />
												</Button>
											</>
										)}
									</div>
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</div>
	);
}
