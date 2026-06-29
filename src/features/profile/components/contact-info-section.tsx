import {
	IconAlertCircle,
	IconMail,
	IconMailCheck,
	IconMailX,
	IconRefresh,
} from "@tabler/icons-react";
import { useSelector } from "@tanstack/react-store";
import type { ContactInfoFormData } from "@/features/profile/validations";
import { contactInfoSchema } from "@/features/profile/validations";
import { BillingFieldsGroup } from "@/shared/components/composable/billing-fields-group";
import { useAppForm } from "@/shared/hooks/use-app-form";
import { useResendVerification } from "@/shared/hooks/use-resend-verification";
import { Alert, AlertDescription } from "@/shared/ui/alert";

interface ContactInfoSectionProps {
	initialData: ContactInfoFormData;
	onSave: (data: ContactInfoFormData) => Promise<void>;
	isLoading?: boolean;
	currentEmail: string;
	emailVerified: boolean;
	pendingEmail?: string;
}

export function ContactInfoSection({
	initialData,
	onSave,
	isLoading,
	currentEmail,
	emailVerified,
	pendingEmail,
}: ContactInfoSectionProps) {
	const { cooldown, isResending, resend, disabled } =
		useResendVerification(currentEmail);

	const form = useAppForm({
		defaultValues: initialData,
		validators: {
			onChange: contactInfoSchema,
			onSubmit: contactInfoSchema,
		},
		onSubmit: async ({ value }) => {
			await onSave(value);
		},
	});

	const email = useSelector(form.store, (s) => s.values.email);
	const emailChanged = email !== currentEmail;

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				void form.handleSubmit();
			}}
			className="space-y-4"
		>
			<form.AppField name="email">
				{(field) => (
					<field.IconInputField
						label="Email *"
						type="email"
						icon={<IconMail className="size-4" />}
						disabled={isLoading || !emailVerified}
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
								type="button"
								onClick={resend}
								disabled={disabled}
								className="ml-2 inline-flex items-center gap-1 text-sm font-medium text-primary underline underline-offset-2 hover:no-underline disabled:opacity-50"
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
				form={form}
				fields={{
					needInvoice: "needInvoice",
					address: "address",
					country: "country",
				}}
				disabled={isLoading}
			/>

			<div className="flex justify-end pt-2">
				<form.AppForm>
					<form.SubmitButton
						label="Save changes"
						submittingLabel="Saving..."
						disabled={isLoading}
						className="h-9"
					/>
				</form.AppForm>
			</div>
		</form>
	);
}
