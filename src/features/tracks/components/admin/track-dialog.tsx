import { IconLoader2 } from "@tabler/icons-react";
import { useState } from "react";
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
import {
	createTrackFn,
	updateTrackFn,
} from "@/features/tracks/api/admin-tracks";
import type { TrackWithStats } from "@/features/tracks/server/admin-tracks";
import { getErrorMessage } from "@/lib/error-message";
import type { ReviewerUser } from "@/lib/server/reviewers";

interface TrackDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	track?: TrackWithStats;
	reviewers: ReviewerUser[];
	onSuccess: () => void;
}

export function TrackDialog({
	open,
	onOpenChange,
	track,
	reviewers,
	onSuccess,
}: TrackDialogProps) {
	const isEdit = !!track;
	const [name, setName] = useState(track?.name || "");
	const [supervisorId, setSupervisorId] = useState<string | undefined>(
		track?.supervisorId || undefined,
	);
	const [isActive, setIsActive] = useState(track?.isActive ?? true);
	const [isSaving, setIsSaving] = useState(false);

	const handleSave = async () => {
		if (!name.trim()) {
			toast.error("Track name is required");
			return;
		}

		if (name.length > 200) {
			toast.error("Track name must be at most 200 characters");
			return;
		}

		setIsSaving(true);
		try {
			if (isEdit) {
				await updateTrackFn({
					data: {
						id: track.id,
						name,
						supervisorId:
							supervisorId === "none" ? null : (supervisorId ?? null),
						isActive,
					},
				});
				toast.success("Track updated");
			} else {
				await createTrackFn({
					data: {
						name,
						supervisorId,
					},
				});
				toast.success("Track created");
			}
			onSuccess();
			onOpenChange(false);
			// Reset form
			setName("");
			setSupervisorId(undefined);
			setIsActive(true);
		} catch (error) {
			toast.error(getErrorMessage(error, "Failed to save track"));
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{isEdit ? "Edit Track" : "Create Track"}</DialogTitle>
					<DialogDescription>
						{isEdit ? "Update track details" : "Create a new conference track"}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="name">Name *</Label>
						<Input
							id="name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Track name"
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
