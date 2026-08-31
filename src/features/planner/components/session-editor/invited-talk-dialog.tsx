import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { invitedTalkQueryOptions } from "@/features/planner/api/presentations";
import type { InvitedTalkDetail } from "@/features/planner/server/invited";
import { conferenceSettingsQueryOptions } from "@/features/settings/api/settings";
import { Form } from "@/shared/components/composable/form";
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
import { InvitedSpeakersInput } from "./invited-speakers-input";
import { useInvitedTalkForm } from "./use-invited-talk-form";

interface InvitedTalkDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	sessionId: string;
	slotId?: string;
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
			<DialogContent
				className="max-h-[90vh] grid-cols-[minmax(0,1fr)] overflow-y-auto sm:max-w-3xl"
				data-testid="invited-talk-dialog"
			>
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
		<Form
			className="space-y-4"
			onSubmit={() => {
				void form.handleSubmit();
			}}
		>
			<div className="grid gap-4 sm:grid-cols-[1fr_auto]">
				<form.AppField name="title">
					{(field) => (
						<field.InputField
							label="Title"
							placeholder="Opening lecture, sponsor address, …"
							testId="invited-talk-title"
						/>
					)}
				</form.AppField>

				{!untimed && (
					<form.Field name="durationMin">
						{(field) => (
							<div className="w-28 space-y-2">
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
			</div>

			<div className="space-y-2">
				<Label>Speakers</Label>
				<form.Field name="speakers">
					{(field) => (
						<InvitedSpeakersInput
							onChange={field.handleChange}
							value={field.state.value}
						/>
					)}
				</form.Field>
			</div>

			<form.AppField name="abstract">
				{(field) => (
					<field.TextareaField
						description="Optional — shown in the talk preview on the public programme."
						label="Abstract"
						rows={3}
						testId="invited-talk-abstract"
					/>
				)}
			</form.AppField>

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
		</Form>
	);
}
