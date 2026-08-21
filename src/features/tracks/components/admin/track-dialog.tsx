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
		}
		setIsSaving(false);
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
					maxLength={200}
					onChange={(e) => onNameChange(e.target.value)}
					placeholder="Track name"
					value={name}
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
					onValueChange={(v) =>
						onSupervisorChange(v === "none" ? undefined : v)
					}
					value={supervisorId || "none"}
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
						checked={isActive}
						id="active"
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
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{labels.title}</DialogTitle>
					<DialogDescription>{labels.description}</DialogDescription>
				</DialogHeader>

				<TrackFormFields
					isActive={form.isActive}
					isEdit={form.isEdit}
					name={form.name}
					onActiveChange={form.setIsActive}
					onNameChange={form.setName}
					onSupervisorChange={form.setSupervisorId}
					reviewers={reviewers}
					supervisorId={form.supervisorId}
				/>

				<DialogFooter>
					<Button onClick={() => onOpenChange(false)} variant="outline">
						Cancel
					</Button>
					<Button disabled={form.isSaving} onClick={form.handleSave}>
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
