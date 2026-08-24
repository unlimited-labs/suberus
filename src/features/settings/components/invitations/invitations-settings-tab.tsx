import { IconClock } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	adminSettingQueryOptions,
	setSettingFn,
} from "@/features/settings/api/settings";
import { SettingsSection } from "@/features/settings/components/settings-section";
import {
	type InvitationSettingsFormValues,
	invitationSettingsFormSchema,
} from "@/features/settings/validations";
import { Form } from "@/shared/components/composable/form";
import { useAppForm } from "@/shared/hooks/use-app-form";
import { getErrorMessage } from "@/shared/lib/error-message";

interface InvitationsSettingsTabProps {
	initialValidityHours: number;
}

export function InvitationsSettingsTab({
	initialValidityHours,
}: InvitationsSettingsTabProps) {
	const queryClient = useQueryClient();

	const defaultValues: InvitationSettingsFormValues = {
		validityHours: String(initialValidityHours),
	};

	const form = useAppForm({
		defaultValues,
		validators: {
			onChange: invitationSettingsFormSchema,
			onSubmit: invitationSettingsFormSchema,
		},
		onSubmit: async ({ value }) => {
			const parsed = invitationSettingsFormSchema.parse(value);
			try {
				await setSettingFn({
					data: {
						key: "INVITATION_VALIDITY_HOURS",
						value: parsed.validityHours,
					},
				});
				await queryClient.invalidateQueries({
					queryKey: adminSettingQueryOptions("INVITATION_VALIDITY_HOURS")
						.queryKey,
				});
				toast.success("Invitation settings saved");
			} catch (error) {
				toast.error(getErrorMessage(error, "Failed to save settings"));
			}
		},
	});

	return (
		<SettingsSection
			description="Configure invitation expiration"
			icon={IconClock}
			title="Invitation Settings"
		>
			<Form
				className="space-y-3"
				onSubmit={() => {
					void form.handleSubmit();
				}}
			>
				<div className="max-w-[200px]">
					<form.AppField name="validityHours">
						{(field) => (
							<field.InputField
								description="How long invitation links remain valid after being sent."
								label="Invitation validity (hours)"
								type="number"
							/>
						)}
					</form.AppField>
				</div>
				<div className="flex justify-end">
					<form.AppForm>
						<form.SubmitButton label="Save" />
					</form.AppForm>
				</div>
			</Form>
		</SettingsSection>
	);
}
