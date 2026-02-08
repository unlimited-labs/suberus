import { IconLoader2 } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { createSessionFn, updateSessionFn } from "@/utils/sessions.functions";
import type { ReviewerUser, SessionWithStats } from "@/utils/sessions.server";

interface SessionDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	session?: SessionWithStats;
	reviewers: ReviewerUser[];
	onSuccess: () => void;
}

export function SessionDialog({
	open,
	onOpenChange,
	session,
	reviewers,
	onSuccess,
}: SessionDialogProps) {
	const isEdit = !!session;
	const [name, setName] = useState(session?.name || "");
	const [supervisorId, setSupervisorId] = useState<string | undefined>(
		session?.supervisorId || undefined,
	);
	const [isActive, setIsActive] = useState(session?.isActive ?? true);
	const [isSaving, setIsSaving] = useState(false);

	// Reset form state when dialog opens or session changes
	useEffect(() => {
		if (open) {
			setName(session?.name || "");
			setSupervisorId(session?.supervisorId || undefined);
			setIsActive(session?.isActive ?? true);
		}
	}, [open, session]);

	const handleSave = async () => {
		if (!name.trim()) {
			toast.error("Session name is required");
			return;
		}

		if (name.length > 200) {
			toast.error("Session name must be at most 200 characters");
			return;
		}

		setIsSaving(true);
		try {
			if (isEdit) {
				await updateSessionFn({
					data: {
						id: session.id,
						name,
						supervisorId:
							supervisorId === "none" ? null : (supervisorId ?? null),
						isActive,
					},
				});
				toast.success("Session updated");
			} else {
				await createSessionFn({
					data: {
						name,
						supervisorId,
					},
				});
				toast.success("Session created");
			}
			onSuccess();
			onOpenChange(false);
			// Reset form
			setName("");
			setSupervisorId(undefined);
			setIsActive(true);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to save session";
			toast.error(message);
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{isEdit ? "Edit Session" : "Create Session"}
					</DialogTitle>
					<DialogDescription>
						{isEdit
							? "Update session details"
							: "Create a new conference session"}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="name">Name *</Label>
						<Input
							id="name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Session name"
							maxLength={200}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="supervisor">Supervisor</Label>
						<Select
							value={supervisorId || "none"}
							onValueChange={(v) =>
								setSupervisorId(v === "none" ? undefined : v)
							}
						>
							<SelectTrigger id="supervisor">
								<SelectValue placeholder="No supervisor" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">None</SelectItem>
								{reviewers.map((reviewer) => (
									<SelectItem key={reviewer.id} value={reviewer.id}>
										{reviewer.name} ({reviewer.email})
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{isEdit && (
						<div className="flex items-center justify-between">
							<Label htmlFor="active">Active</Label>
							<Switch
								id="active"
								checked={isActive}
								onCheckedChange={setIsActive}
							/>
						</div>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleSave} disabled={isSaving}>
						{isSaving && <IconLoader2 className="mr-2 size-4 animate-spin" />}
						{isEdit ? "Save" : "Create"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
