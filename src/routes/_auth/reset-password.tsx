import {
	IconArrowLeft,
	IconCheck,
	IconExclamationCircle,
} from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { AuthCard } from "@/features/auth/components/auth-card";
import { resetPasswordSchema } from "@/features/auth/validations";
import { PasswordFieldsGroup } from "@/shared/components/composable/password-fields-group";
import { useAppForm } from "@/shared/hooks/use-app-form";
import { resetPassword } from "@/shared/lib/auth-client";

const searchSchema = z.object({
	token: z.string().optional(),
});

export const Route = createFileRoute("/_auth/reset-password")({
	validateSearch: searchSchema,
	component: ResetPasswordPage,
});

function ResetPasswordPage() {
	const { token } = Route.useSearch();
	const [isSuccess, setIsSuccess] = useState(false);
	const [tokenError, setTokenError] = useState(false);

	const form = useAppForm({
		defaultValues: {
			newPassword: "",
			confirmPassword: "",
		},
		validators: {
			onChange: resetPasswordSchema,
			onSubmit: resetPasswordSchema,
		},
		onSubmit: async ({ value }) => {
			if (!token) return;

			const response = await resetPassword({
				token,
				newPassword: value.newPassword,
			});

			if (response.error) {
				if (
					response.error.message?.includes("invalid") ||
					response.error.message?.includes("expired")
				) {
					setTokenError(true);
				} else {
					toast.error(response.error.message ?? "Failed to reset password");
				}
				return;
			}

			setIsSuccess(true);
		},
	});

	if (!token || tokenError) {
		return (
			<AuthCard centered>
				<div className="w-full max-w-sm space-y-4 text-center">
					<div className="mx-auto flex size-14 items-center justify-center rounded-full bg-destructive/10">
						<IconExclamationCircle className="size-7 text-destructive" />
					</div>
					<div>
						<h1 className="text-xl font-semibold tracking-tight">
							{tokenError ? "Link expired" : "Invalid reset link"}
						</h1>
						<p className="mt-1 text-sm text-muted-foreground">
							{tokenError
								? "This password reset link has expired or is invalid. Please request a new one."
								: "The password reset link is missing or invalid. Please request a new one."}
						</p>
					</div>
					<Link
						className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
						to="/forgot-password"
					>
						Request new link
					</Link>
				</div>
			</AuthCard>
		);
	}

	if (isSuccess) {
		return (
			<AuthCard centered>
				<div className="w-full max-w-sm space-y-4 text-center">
					<div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10">
						<IconCheck className="size-7 text-primary" />
					</div>
					<div>
						<h1 className="text-xl font-semibold tracking-tight">
							Password reset successful
						</h1>
						<p className="mt-1 text-sm text-muted-foreground">
							Your password has been changed. You can now sign in with your new
							password.
						</p>
					</div>
					<Link
						className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
						to="/login"
					>
						Sign in
					</Link>
				</div>
			</AuthCard>
		);
	}

	return (
		<AuthCard subtitle="Enter your new password below" title="Reset password">
			<form
				className="flex flex-1 flex-col"
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					void form.handleSubmit();
				}}
			>
				<div className="flex-1 space-y-3">
					<PasswordFieldsGroup
						confirmLabel="Confirm Password"
						fields={{ password: "newPassword", confirm: "confirmPassword" }}
						form={form}
						passwordDescription="Min. 10 characters"
						passwordLabel="New Password"
					/>
				</div>

				<div className="mt-4">
					<form.AppForm>
						<form.SubmitButton
							className="h-9 w-full"
							label="Reset password"
							submittingLabel="Resetting..."
						/>
					</form.AppForm>
				</div>
			</form>

			<p className="mt-3 text-center">
				<Link
					className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
					to="/login"
				>
					<IconArrowLeft className="size-4" />
					Back to login
				</Link>
			</p>
		</AuthCard>
	);
}
