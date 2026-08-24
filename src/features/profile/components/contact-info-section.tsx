import {
	IconAlertCircle,
	IconMail,
	IconMailCheck,
	IconMailX,
	IconRefresh,
} from "@tabler/icons-react";
import { useSelector } from "@tanstack/react-store";
import { useState } from "react";
import { EmailChangeConfirmDialog } from "@/features/profile/components/email-change-confirm-dialog";
import type { ContactInfoFormData } from "@/features/profile/validations";
import { contactInfoSchema } from "@/features/profile/validations";
import { BillingFieldsGroup } from "@/shared/components/composable/billing-fields-group";
import { Form } from "@/shared/components/composable/form";
import { useAppForm } from "@/shared/hooks/use-app-form";
import { useResendVerification } from "@/shared/hooks/use-resend-verification";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";

interface ContactInfoSectionProps {
	initialData: ContactInfoFormData;
	onSave: (
		data: ContactInfoFormData,
		currentPassword?: string,
	) => Promise<void>;
	isLoading?: boolean;
	contactConsentEnabled: boolean;
	currentEmail: string;
	emailVerified: boolean;
	pendingEmail?: string;
}

export function ContactInfoSection({
	initialData,
	onSave,
	isLoading,
	contactConsentEnabled,
	currentEmail,
	emailVerified,
	pendingEmail,
}: ContactInfoSectionProps) {
	const { cooldown, isResending, resend, disabled } =
		useResendVerification(currentEmail);

	const [pendingSave, setPendingSave] = useState<ContactInfoFormData | null>(
		null,
	);
	const [isConfirming, setIsConfirming] = useState(false);

	const form = useAppForm({
		defaultValues: initialData,
		validators: {
			onChange: contactInfoSchema,
			onSubmit: contactInfoSchema,
		},
		onSubmit: async ({ value }) => {
			if (value.email !== currentEmail) {
				setPendingSave(value);
				return;
			}
			await onSave(value);
		},
	});

	const email = useSelector(form.store, (s) => s.values.email);
	const emailChanged = email !== currentEmail;

	const confirmEmailChange = async (password: string) => {
		if (!pendingSave) return;
		setIsConfirming(true);
		try {
			await onSave(pendingSave, password);
			setPendingSave(null);
		} catch {}
		setIsConfirming(false);
	};

	return (
		<Form
			className="space-y-4"
			onSubmit={() => {
				void form.handleSubmit();
			}}
		>
			<form.AppField name="email">
				{(field) => (
					<field.IconInputField
						disabled={isLoading || !emailVerified}
						icon={<IconMail className="size-4" />}
						label="Email *"
						type="email"
					/>
				)}
			</form.AppField>

			{!emailChanged && (
				<div className="flex items-center gap-2">
					{emailVerified ? (
						<>
							<IconMailCheck className="size-4 text-green-600" />
							<span className="text-sm text-green-600">Email verified</span>
						</>
					) : (
						<>
							<IconMailX className="size-4 text-yellow-600" />
							<span className="text-sm text-yellow-600">
								Email not verified
							</span>
							<button
								className="text-primary ml-2 inline-flex items-center gap-1 text-sm font-medium underline underline-offset-2 hover:no-underline disabled:opacity-50"
								disabled={disabled}
								onClick={resend}
								type="button"
							>
								<IconRefresh
									className={`size-3 ${isResending ? "animate-spin" : ""}`}
								/>
								{cooldown > 0
									? `Resend in ${cooldown}s`
									: isResending
										? "Sending..."
										: "Resend"}
							</button>
						</>
					)}
				</div>
			)}

			{emailChanged && (
				<Alert>
					<IconAlertCircle className="size-4" />
					<AlertDescription>
						Changing your email requires verification. You will receive a
						verification link at the new email address. Your current email will
						remain active until you verify the new one.
					</AlertDescription>
				</Alert>
			)}

			{!emailChanged && pendingEmail && (
				<Alert>
					<IconMail className="size-4" />
					<AlertDescription>
						A verification link has been sent to <strong>{pendingEmail}</strong>
						. Your current email will remain active until you verify the new
						one.
					</AlertDescription>
				</Alert>
			)}

			<BillingFieldsGroup
				disabled={isLoading}
				fields={{
					needInvoice: "needInvoice",
					address: "address",
					country: "country",
				}}
				form={form}
			/>

			{(contactConsentEnabled || initialData.contactConsent) && (
				<form.Field name="contactConsent">
					{(field) => (
						<div className="border-border/50 flex items-start justify-between gap-4 rounded-lg border p-3">
							<Label
								className="text-sm leading-snug font-normal"
								htmlFor="contactConsent"
							>
								I consent to my name, affiliation and e-mail address being
								included in the participant list made available to the other
								participants of the event, for networking purposes.
							</Label>
							<Switch
								checked={field.state.value === true}
								data-testid="contact-consent-switch"
								disabled={isLoading}
								id="contactConsent"
								onCheckedChange={(checked) =>
									field.handleChange(checked === true)
								}
							/>
						</div>
					)}
				</form.Field>
			)}

			<div className="flex justify-end pt-2">
				<form.AppForm>
					<form.SubmitButton
						className="h-9"
						disabled={isLoading}
						label="Save changes"
						submittingLabel="Saving..."
					/>
				</form.AppForm>
			</div>

			<EmailChangeConfirmDialog
				isSubmitting={isConfirming}
				onConfirm={confirmEmailChange}
				onOpenChange={(next) => {
					if (!next) setPendingSave(null);
				}}
				open={pendingSave !== null}
			/>
		</Form>
	);
}
