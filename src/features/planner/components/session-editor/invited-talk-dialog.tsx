import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { invitedTalkQueryOptions } from "@/features/planner/api/presentations";
import type { InvitedTalkDetail } from "@/features/planner/server/invited";
import { conferenceSettingsQueryOptions } from "@/features/settings/api/settings";
import { Button } from "@/shared/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";
import { Label } from "@/shared/ui/label";
import { Stepper } from "../stepper";
import { useInvitedTalkForm } from "./use-invited-talk-form";

interface InvitedTalkDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	sessionId: string;
	/** Slot being edited; omitted when adding a new invited talk. */
	slotId?: string;
	/** Duration is meaningless in an untimed session — hide the field. */
	untimed: boolean;
}

export function InvitedTalkDialog({
	open,
	onOpenChange,
	sessionId,
	slotId,
	untimed,
}: InvitedTalkDialogProps) {
	const detail = useQuery({
		...invitedTalkQueryOptions(slotId ?? ""),
		enabled: open && slotId !== undefined,
	});
	// data === null means the slot vanished (or is not invited) — falling through
	// would silently render the Add form and duplicate the talk on save.
	const gone = slotId !== undefined && detail.data === null;
	const ready = slotId === undefined || detail.data != null;

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent data-testid="invited-talk-dialog">
				<DialogHeader>
					<DialogTitle>
						{slotId ? "Edit invited talk" : "Add invited talk"}
					</DialogTitle>
					<DialogDescription>
						A talk that never went through submission — a keynote, invited
						lecture or sponsor slot. Only the title is required.
					</DialogDescription>
				</DialogHeader>
				{ready ? (
					<InvitedTalkForm
						onClose={() => onOpenChange(false)}
						sessionId={sessionId}
						talk={detail.data ?? null}
						untimed={untimed}
					/>
				) : (
					<p className="text-muted-foreground py-6 text-sm">
						{gone
							? "This invited talk is no longer in the session — close and reload the planner."
							: detail.isError
								? "Could not load this invited talk."
								: "Loading…"}
					</p>
				)}
			</DialogContent>
		</Dialog>
	);
}

function InvitedTalkForm({
	sessionId,
	talk,
	untimed,
	onClose,
}: {
	sessionId: string;
	talk: InvitedTalkDetail | null;
	untimed: boolean;
	onClose: () => void;
}) {
	const { data: settings } = useSuspenseQuery(conferenceSettingsQueryOptions());
	const { form, isEdit } = useInvitedTalkForm({
		sessionId,
		talk,
		defaultDurationMin: settings.defaultPresentationMin,
		onClose,
	});

	return (
		<form
			className="space-y-4"
			noValidate
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				void form.handleSubmit();
			}}
		>
			<form.AppField name="title">
				{(field) => (
					<field.InputField
						label="Title"
						placeholder="Opening lecture, sponsor address, …"
						testId="invited-talk-title"
					/>
				)}
			</form.AppField>

			<div className="grid gap-4 sm:grid-cols-2">
				<form.AppField name="speakerFirstName">
					{(field) => (
						<field.InputField
							label="Speaker first name"
							placeholder="Optional"
							testId="invited-talk-first-name"
						/>
					)}
				</form.AppField>
				<form.AppField name="speakerLastName">
					{(field) => (
						<field.InputField
							label="Speaker last name"
							placeholder="Optional"
							testId="invited-talk-last-name"
						/>
					)}
				</form.AppField>
			</div>

			<form.AppField name="affiliationName">
				{(field) => (
					<field.InputField
						label="Affiliation"
						placeholder="Optional — university, company, …"
						testId="invited-talk-affiliation"
					/>
				)}
			</form.AppField>

			<form.AppField name="abstract">
				{(field) => (
					<field.TextareaField
						description="Optional — shown in the talk preview on the public programme."
						label="Abstract"
						rows={4}
						testId="invited-talk-abstract"
					/>
				)}
			</form.AppField>

			{!untimed && (
				<form.Field name="durationMin">
					{(field) => (
						<div className="space-y-2">
							<Label>Duration (min)</Label>
							<Stepper
								max={240}
								min={5}
								onChange={field.handleChange}
								step={5}
								value={field.state.value}
							/>
						</div>
					)}
				</form.Field>
			)}

			<DialogFooter>
				<Button onClick={onClose} type="button" variant="outline">
					Cancel
				</Button>
				<form.AppForm>
					<form.SubmitButton
						label={isEdit ? "Save" : "Add"}
						testId="invited-talk-submit"
					/>
				</form.AppForm>
			</DialogFooter>
		</form>
	);
}
