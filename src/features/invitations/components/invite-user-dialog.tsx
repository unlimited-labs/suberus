import { IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";
import { useWebMCP } from "use-webmcp-tool";
import { z } from "zod";
import { createInvitationFn } from "@/features/invitations/api/admin-invitations";
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

const inviteSchema = z.object({
	email: z
		.email("Enter a valid email address")
		.describe("Address the invitation is sent to."),
	role: z
		.enum(["REVIEWER", "EDITOR", "ADMIN"])
		.describe("Role the person gets after registering."),
});

const INVITE_TOOL_SCHEMA = z.toJSONSchema(inviteSchema);

type InviteValues = z.infer<typeof inviteSchema>;

const defaultValues: InviteValues = { email: "", role: "REVIEWER" };

const roleOptions = [
	{ value: "REVIEWER", label: "Reviewer" },
	{ value: "EDITOR", label: "Editor" },
	{ value: "ADMIN", label: "Administrator" },
];

interface InviteUserDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess: () => void;
}

export function InviteUserDialog({
	open,
	onOpenChange,
	onSuccess,
}: InviteUserDialogProps) {
	const form = useAppForm({
		defaultValues,
		validators: { onChange: inviteSchema, onSubmit: inviteSchema },
		onSubmit: async ({ value, formApi }) => {
			try {
				await createInvitationFn({
					data: { email: value.email.trim(), role: value.role },
				});
			} catch (error) {
				const msg = getErrorMessage(error, "Failed to send invitation");
				toast.error(
					/already exists/i.test(msg)
						? "User with this email already exists"
						: msg,
				);
				return;
			}
			toast.success("Invitation sent");
			formApi.reset();
			onOpenChange(false);
			onSuccess();
		},
	});

	useWebMCP({
		name: "prepare-invitation",
		description:
			"Opens the invite-user form filled in, for the user to review and send. Use when the user wants to invite someone to the conference system.",
		inputSchema: INVITE_TOOL_SCHEMA,
		execute: (args) => {
			const parsed = inviteSchema.safeParse(args);
			if (!parsed.success) return { error: z.prettifyError(parsed.error) };
			form.setFieldValue("email", parsed.data.email);
			form.setFieldValue("role", parsed.data.role);
			onOpenChange(true);
			return "The invitation form is open and filled in. Nothing is sent until the user clicks Send Invitation.";
		},
	});

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Invite User</DialogTitle>
					<DialogDescription>
						Send an invitation email with a registration link.
					</DialogDescription>
				</DialogHeader>
				<Form className="space-y-4" onSubmit={() => void form.handleSubmit()}>
					<form.AppField name="email">
						{(field) => (
							<field.InputField
								label="Email"
								placeholder="user@example.com"
								type="email"
							/>
						)}
					</form.AppField>
					<form.AppField name="role">
						{(field) => (
							<field.SelectField label="Role" options={roleOptions} />
						)}
					</form.AppField>
					<DialogFooter>
						<form.Subscribe selector={(s) => s.isSubmitting}>
							{(isSubmitting) => (
								<Button disabled={isSubmitting} type="submit">
									{isSubmitting && (
										<IconLoader2 className="mr-2 size-4 animate-spin" />
									)}
									Send Invitation
								</Button>
							)}
						</form.Subscribe>
					</DialogFooter>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
