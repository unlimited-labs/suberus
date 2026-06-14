import {
	IconAlertCircle,
	IconMail,
	IconMailCheck,
	IconMailX,
	IconRefresh,
} from "@tabler/icons-react";
import { useStore } from "@tanstack/react-form";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BillingFieldsGroup } from "@/components/forms/composable/billing-fields-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ContactInfoFormData } from "@/features/profile/validations";
import { contactInfoSchema } from "@/features/profile/validations";
import { sendVerificationEmail } from "@/lib/auth-client";
import { useAppForm } from "@/shared/hooks/use-app-form";

interface ContactInfoSectionProps {
	initialData: ContactInfoFormData;
	onSave: (data: ContactInfoFormData) => Promise<void>;
	isLoading?: boolean;
	currentEmail: string;
	emailVerified: boolean;
	pendingEmail?: string;
}

const RESEND_COOLDOWN = 60;

export function ContactInfoSection({
	initialData,
	onSave,
	isLoading,
	currentEmail,
	emailVerified,
	pendingEmail,
}: ContactInfoSectionProps) {
	const [cooldown, setCooldown] = useState(0);
	const [isResending, setIsResending] = useState(false);

	useEffect(() => {
		if (cooldown <= 0) return;

		const timer = setInterval(() => {
			setCooldown((prev) => prev - 1);
		}, 1000);

		return () => clearInterval(timer);
	}, [cooldown]);

	const handleResend = async () => {
		if (cooldown > 0 || isResending) return;

		setIsResending(true);
		try {
			const result = await sendVerificationEmail({ email: currentEmail });
			if (result.error) {
				toast.error(result.error.message ?? "Failed to send email");
			} else {
				toast.success("Verification email sent");
				setCooldown(RESEND_COOLDOWN);
			}
		} catch {
			toast.error("Failed to send email");
		} finally {
			setIsResending(false);
		}
	};

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

	const email = useStore(form.store, (s) => s.values.email);
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
			{/* Email */}
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

			{/* Email verification status */}
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
								onClick={handleResend}
								disabled={cooldown > 0 || isResending}
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

			{/* Email change warning */}
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

			{/* Pending email verification notice */}
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

			{/* Invoice / billing details */}
			<BillingFieldsGroup
				form={form}
				fields={{
					needInvoice: "needInvoice",
					address: "address",
					country: "country",
				}}
				disabled={isLoading}
			/>

			{/* Save button */}
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
