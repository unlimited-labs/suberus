import { IconLoader2 } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import type { ReviewerUser } from "@/features/reviews/server/reviewers";
import {
	createTrackFn,
	updateTrackFn,
} from "@/features/tracks/api/admin-tracks";
import {
	initialTrackForm,
	normalizeSupervisorId,
	trackDialogLabels,
	validateTrackName,
} from "@/features/tracks/components/admin/track-form-helpers";
import type { TrackWithStats } from "@/features/tracks/server/admin-tracks";
import { getErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";
import { Switch } from "@/shared/ui/switch";

interface TrackDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	track?: TrackWithStats;
	reviewers: ReviewerUser[];
	onSuccess: () => void;
}

function useTrackForm(track: TrackWithStats | undefined, onSaved: () => void) {
	const isEdit = !!track;
	const initial = initialTrackForm(track);
	const [name, setName] = useState(initial.name);
	const [supervisorId, setSupervisorId] = useState(initial.supervisorId);
	const [isActive, setIsActive] = useState(initial.isActive);
	const [isSaving, setIsSaving] = useState(false);

	const handleSave = async () => {
		const nameError = validateTrackName(name);
		if (nameError) {
			toast.error(nameError);
			return;
		}

		setIsSaving(true);
		try {
			if (isEdit) {
				await updateTrackFn({
					data: {
						id: track.id,
						name,
						supervisorId: normalizeSupervisorId(supervisorId),
						isActive,
					},
				});
				toast.success("Track updated");
			} else {
				await createTrackFn({ data: { name, supervisorId } });
				toast.success("Track created");
			}
			onSaved();
			setName("");
			setSupervisorId(undefined);
			setIsActive(true);
		} catch (error) {
			toast.error(getErrorMessage(error, "Failed to save track"));
		} finally {
			setIsSaving(false);
		}
	};

	return {
		isEdit,
		name,
		setName,
		supervisorId,
		setSupervisorId,
		isActive,
		setIsActive,
		isSaving,
		handleSave,
	};
}

function TrackFormFields({
	isEdit,
	name,
	onNameChange,
	supervisorId,
	onSupervisorChange,
	isActive,
	onActiveChange,
	reviewers,
}: {
	isEdit: boolean;
	name: string;
	onNameChange: (value: string) => void;
	supervisorId: string | undefined;
	onSupervisorChange: (value: string | undefined) => void;
	isActive: boolean;
	onActiveChange: (value: boolean) => void;
	reviewers: ReviewerUser[];
}) {
	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<Label htmlFor="name">Name *</Label>
				<Input
					id="name"
					value={name}
					onChange={(e) => onNameChange(e.target.value)}
					placeholder="Track name"
					maxLength={200}
				/>
			</div>

			<div className="space-y-2">
				<Label htmlFor="supervisor">Supervisor</Label>
				<Select
					items={[
						{ value: "none", label: "None" },
						...reviewers.map((reviewer) => ({
							value: reviewer.id,
							label: `${reviewer.name} (${reviewer.email})`,
						})),
					]}
					value={supervisorId || "none"}
					onValueChange={(v) =>
						onSupervisorChange(v === "none" ? undefined : v)
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
						onCheckedChange={onActiveChange}
					/>
				</div>
			)}
		</div>
	);
}

export function TrackDialog({
	open,
	onOpenChange,
	track,
	reviewers,
	onSuccess,
}: TrackDialogProps) {
	const form = useTrackForm(track, () => {
		onSuccess();
		onOpenChange(false);
	});
	const labels = trackDialogLabels(form.isEdit);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{labels.title}</DialogTitle>
					<DialogDescription>{labels.description}</DialogDescription>
				</DialogHeader>

				<TrackFormFields
					isEdit={form.isEdit}
					name={form.name}
					onNameChange={form.setName}
					supervisorId={form.supervisorId}
					onSupervisorChange={form.setSupervisorId}
					isActive={form.isActive}
					onActiveChange={form.setIsActive}
					reviewers={reviewers}
				/>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={form.handleSave} disabled={form.isSaving}>
						{form.isSaving && (
							<IconLoader2 className="mr-2 size-4 animate-spin" />
						)}
						{labels.submitLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
