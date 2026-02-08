import {
	IconArrowLeft,
	IconCheck,
	IconExclamationCircle,
} from "@tabler/icons-react";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { AuthSidebar } from "@/components/forms/auth-sidebar";
import { FieldError } from "@/components/forms/field-error";
import { PasswordInput } from "@/components/forms/password-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useZodFormField } from "@/hooks/use-zod-form-field";
import { resetPassword } from "@/lib/auth-client";
import { resetPasswordSchema } from "@/lib/validations/auth";

const searchSchema = z.object({
	token: z.string().optional(),
});

export const Route = createFileRoute("/_auth/reset-password")({
	validateSearch: searchSchema,
	component: ResetPasswordPage,
});

const passwordSchema = z
	.string()
	.min(1, "Password is required")
	.min(10, "Password must be at least 10 characters");

const confirmPasswordSchema = z.string().min(1, "Please confirm your password");

function ResetPasswordPage() {
	const { token } = Route.useSearch();
	const { conferenceName, conferenceDate, conferenceLocation } =
		Route.useRouteContext();
	const [isSuccess, setIsSuccess] = useState(false);
	const [tokenError, setTokenError] = useState(false);

	const passwordValidators = useZodFormField(passwordSchema);
	const confirmValidators = useZodFormField(confirmPasswordSchema);

	const form = useForm({
		defaultValues: {
			newPassword: "",
			confirmPassword: "",
		},
		onSubmit: async ({ value }) => {
			if (!token) return;

			// Validate passwords match
			const result = resetPasswordSchema.safeParse(value);
			if (!result.success) {
				toast.error(result.error.issues[0]?.message ?? "Validation failed");
				return;
			}

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

	// No token provided
	if (!token) {
		return (
			<div className="mx-auto flex w-full max-w-3xl overflow-hidden rounded-2xl bg-card shadow-2xl">
				<AuthSidebar
					conferenceName={conferenceName}
					conferenceDate={conferenceDate}
					conferenceLocation={conferenceLocation}
				/>
				<div className="flex flex-1 flex-col items-center justify-center bg-card p-5 text-foreground sm:p-6 lg:p-8">
					<div className="w-full max-w-sm space-y-4 text-center">
						<div className="mx-auto flex size-14 items-center justify-center rounded-full bg-destructive/10">
							<IconExclamationCircle className="size-7 text-destructive" />
						</div>
						<div>
							<h1 className="text-xl font-semibold tracking-tight">
								Invalid reset link
							</h1>
							<p className="mt-1 text-sm text-muted-foreground">
								The password reset link is missing or invalid. Please request a
								new one.
							</p>
						</div>
						<Link
							to="/forgot-password"
							className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
						>
							Request new link
						</Link>
					</div>
				</div>
			</div>
		);
	}

	// Token invalid/expired (after submit attempt)
	if (tokenError) {
		return (
			<div className="mx-auto flex w-full max-w-3xl overflow-hidden rounded-2xl bg-card shadow-2xl">
				<AuthSidebar
					conferenceName={conferenceName}
					conferenceDate={conferenceDate}
					conferenceLocation={conferenceLocation}
				/>
				<div className="flex flex-1 flex-col items-center justify-center bg-card p-5 text-foreground sm:p-6 lg:p-8">
					<div className="w-full max-w-sm space-y-4 text-center">
						<div className="mx-auto flex size-14 items-center justify-center rounded-full bg-destructive/10">
							<IconExclamationCircle className="size-7 text-destructive" />
						</div>
						<div>
							<h1 className="text-xl font-semibold tracking-tight">
								Link expired
							</h1>
							<p className="mt-1 text-sm text-muted-foreground">
								This password reset link has expired or is invalid. Please
								request a new one.
							</p>
						</div>
						<Link
							to="/forgot-password"
							className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
						>
							Request new link
						</Link>
					</div>
				</div>
			</div>
		);
	}

	// Success
	if (isSuccess) {
		return (
			<div className="mx-auto flex w-full max-w-3xl overflow-hidden rounded-2xl bg-card shadow-2xl">
				<AuthSidebar
					conferenceName={conferenceName}
					conferenceDate={conferenceDate}
					conferenceLocation={conferenceLocation}
				/>
				<div className="flex flex-1 flex-col items-center justify-center bg-card p-5 text-foreground sm:p-6 lg:p-8">
					<div className="w-full max-w-sm space-y-4 text-center">
						<div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10">
							<IconCheck className="size-7 text-primary" />
						</div>
						<div>
							<h1 className="text-xl font-semibold tracking-tight">
								Password reset successful
							</h1>
							<p className="mt-1 text-sm text-muted-foreground">
								Your password has been changed. You can now sign in with your
								new password.
							</p>
						</div>
						<Link
							to="/login"
							className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
						>
							Sign in
						</Link>
					</div>
				</div>
			</div>
		);
	}

	// Form
	return (
		<div className="mx-auto flex w-full max-w-3xl overflow-hidden rounded-2xl bg-card shadow-2xl">
			<AuthSidebar
				conferenceName={conferenceName}
				conferenceDate={conferenceDate}
				conferenceLocation={conferenceLocation}
			/>
			<div className="flex flex-1 flex-col bg-card p-5 text-foreground sm:p-6 lg:p-8">
				{/* Mobile header */}
				<div className="mb-4 lg:hidden">
					<h1 className="text-lg font-bold">{conferenceName}</h1>
				</div>

				{/* Desktop header */}
				<div className="mb-4 hidden lg:block">
					<h1 className="text-xl font-semibold tracking-tight">
						Reset password
					</h1>
					<p className="text-sm text-muted-foreground">
						Enter your new password below
					</p>
				</div>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						void form.handleSubmit();
					}}
					className="flex flex-1 flex-col"
				>
					<div className="flex-1 space-y-3">
						<form.Field name="newPassword" validators={passwordValidators}>
							{(field) => (
								<div className="space-y-1">
									<Label htmlFor={field.name}>New Password</Label>
									<PasswordInput
										id={field.name}
										hasError={field.state.meta.errors.length > 0}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={field.handleChange}
									/>
									<FieldError errors={field.state.meta.errors} />
								</div>
							)}
						</form.Field>

						<form.Field name="confirmPassword" validators={confirmValidators}>
							{(field) => (
								<div className="space-y-1">
									<Label htmlFor={field.name}>Confirm Password</Label>
									<PasswordInput
										id={field.name}
										hasError={field.state.meta.errors.length > 0}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={field.handleChange}
									/>
									<FieldError errors={field.state.meta.errors} />
								</div>
							)}
						</form.Field>
					</div>

					<div className="mt-4">
						<Button
							type="submit"
							className="h-9 w-full"
							disabled={form.state.isSubmitting}
						>
							{form.state.isSubmitting ? "Resetting..." : "Reset password"}
						</Button>
					</div>
				</form>

				<p className="mt-3 text-center">
					<Link
						to="/login"
						className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
					>
						<IconArrowLeft className="size-4" />
						Back to login
					</Link>
				</p>
			</div>
		</div>
	);
}
