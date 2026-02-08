import { IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReviewerUser, SessionWithStats } from "@/utils/sessions.server";
import { SessionDialog } from "./session-dialog";
import { SessionsList } from "./sessions-list";

interface SessionsTabProps {
	initialSessions: SessionWithStats[];
	reviewers: ReviewerUser[];
	onUpdate: () => void;
}

export function SessionsTab({
	initialSessions,
	reviewers,
	onUpdate,
}: SessionsTabProps) {
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingSession, setEditingSession] = useState<SessionWithStats | null>(
		null,
	);

	const handleEdit = (session: SessionWithStats) => {
		setEditingSession(session);
		setDialogOpen(true);
	};

	const handleCloseDialog = () => {
		setDialogOpen(false);
		setEditingSession(null);
	};

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle>Conference Sessions</CardTitle>
						<Button onClick={() => setDialogOpen(true)}>
							<IconPlus className="mr-2 size-4" />
							Create Session
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					<SessionsList
						sessions={initialSessions}
						onEdit={handleEdit}
						onUpdate={onUpdate}
					/>
				</CardContent>
			</Card>

			<SessionDialog
				open={dialogOpen}
				onOpenChange={handleCloseDialog}
				session={editingSession || undefined}
				reviewers={reviewers}
				onSuccess={onUpdate}
			/>
		</div>
	);
}
