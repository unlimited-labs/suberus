import { IconLoader2 } from "@tabler/icons-react";
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
} from "@/features/tracks/components/admin/track-form-helpers";
import type { TrackWithStats } from "@/features/tracks/server/admin-tracks";
import { trackFormSchema } from "@/features/tracks/validations";
import { Form } from "@/shared/components/composable/form";
import { useAppForm } from "@/shared/hooks/use-app-form";
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
	const initial = initialTrackForm(track);
	const labels = trackDialogLabels(isEdit);

	const form = useAppForm({
		defaultValues: {
			name: initial.name,
			supervisorId: initial.supervisorId ?? "none",
			isActive: initial.isActive,
		},
		validators: { onChange: trackFormSchema, onSubmit: trackFormSchema },
		onSubmit: async ({ value, formApi }) => {
			try {
				if (track) {
					await updateTrackFn({
						data: {
							id: track.id,
							name: value.name,
							supervisorId: normalizeSupervisorId(value.supervisorId),
							isActive: value.isActive,
						},
					});
					toast.success("Track updated");
				} else {
					await createTrackFn({
						data: {
							name: value.name,
							supervisorId:
								normalizeSupervisorId(value.supervisorId) ?? undefined,
						},
					});
					toast.success("Track created");
				}
			} catch (error) {
				toast.error(getErrorMessage(error, "Failed to save track"));
				return;
			}
			onSuccess();
			onOpenChange(false);
			formApi.reset();
		},
	});

	const supervisorOptions = [
		{ value: "none", label: "None" },
		...reviewers.map((reviewer) => ({
			value: reviewer.id,
			label: `${reviewer.name} (${reviewer.email})`,
		})),
	];

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{labels.title}</DialogTitle>
					<DialogDescription>{labels.description}</DialogDescription>
				</DialogHeader>

				<Form className="space-y-4" onSubmit={() => void form.handleSubmit()}>
					<form.AppField name="name">
						{(field) => (
							<field.InputField label="Name *" placeholder="Track name" />
						)}
					</form.AppField>

					<form.AppField name="supervisorId">
						{(field) => (
							<field.SelectField
								label="Supervisor"
								options={supervisorOptions}
								placeholder="No supervisor"
							/>
						)}
					</form.AppField>

					{isEdit && (
						<form.AppField name="isActive">
							{(field) => <field.SwitchField label="Active" />}
						</form.AppField>
					)}

					<DialogFooter>
						<Button
							onClick={() => onOpenChange(false)}
							type="button"
							variant="outline"
						>
							Cancel
						</Button>
						<form.Subscribe selector={(s) => s.isSubmitting}>
							{(isSubmitting) => (
								<Button disabled={isSubmitting} type="submit">
									{isSubmitting && (
										<IconLoader2 className="mr-2 size-4 animate-spin" />
									)}
									{labels.submitLabel}
								</Button>
							)}
						</form.Subscribe>
					</DialogFooter>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
