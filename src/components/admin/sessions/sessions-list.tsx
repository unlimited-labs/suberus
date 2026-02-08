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
import { deleteSessionFn, updateSessionFn } from "@/utils/sessions.functions";
import type { SessionWithStats } from "@/utils/sessions.server";

interface SessionsListProps {
	sessions: SessionWithStats[];
	onEdit: (session: SessionWithStats) => void;
	onUpdate: () => void;
}

export function SessionsList({
	sessions,
	onEdit,
	onUpdate,
}: SessionsListProps) {
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [togglingId, setTogglingId] = useState<string | null>(null);

	const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

	const handleDeleteClick = (id: string, submissionCount: number) => {
		if (submissionCount > 0) {
			toast.error(
				`Cannot delete session with ${submissionCount} submission(s)`,
			);
			return;
		}
		setConfirmDeleteId(id);
	};

	const handleDeleteConfirm = async () => {
		if (!confirmDeleteId) return;
		setDeletingId(confirmDeleteId);
		setConfirmDeleteId(null);
		try {
			await deleteSessionFn({ data: { id: confirmDeleteId } });
			toast.success("Session deleted");
			onUpdate();
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to delete session";
			toast.error(message);
		} finally {
			setDeletingId(null);
		}
	};

	const handleToggleActive = async (id: string, currentActive: boolean) => {
		setTogglingId(id);
		try {
			await updateSessionFn({
				data: {
					id,
					isActive: !currentActive,
				},
			});
			toast.success(`Session ${!currentActive ? "activated" : "deactivated"}`);
			onUpdate();
		} catch (_error) {
			toast.error("Failed to update session");
		} finally {
			setTogglingId(null);
		}
	};

	if (sessions.length === 0) {
		return (
			<div className="flex min-h-[200px] items-center justify-center rounded-md border border-dashed">
				<p className="text-sm text-muted-foreground">
					No sessions yet. Create your first session.
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
					{sessions.map((session) => (
						<TableRow key={session.id}>
							<TableCell className="font-medium">{session.name}</TableCell>
							<TableCell>
								{session.supervisorName || (
									<span className="text-muted-foreground">None</span>
								)}
							</TableCell>
							<TableCell className="text-center">
								<Badge variant="secondary">{session.submissionCount}</Badge>
							</TableCell>
							<TableCell className="text-center">
								<Switch
									checked={session.isActive}
									onCheckedChange={() =>
										handleToggleActive(session.id, session.isActive)
									}
									disabled={togglingId === session.id}
								/>
							</TableCell>
							<TableCell className="text-right">
								<div className="flex justify-end gap-2">
									{confirmDeleteId === session.id ? (
										<>
											<Button
												variant="destructive"
												size="sm"
												onClick={handleDeleteConfirm}
												disabled={deletingId === session.id}
											>
												{deletingId === session.id ? (
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
												onClick={() => onEdit(session)}
												aria-label="Edit"
											>
												<IconEdit className="size-4" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												onClick={() =>
													handleDeleteClick(session.id, session.submissionCount)
												}
												disabled={
													session.submissionCount > 0 ||
													deletingId === session.id
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
