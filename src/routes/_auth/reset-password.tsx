import {
	IconArrowLeft,
	IconCheck,
	IconExclamationCircle,
} from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { AuthSidebar } from "@/components/forms/auth-sidebar";
import { Button } from "@/components/ui/button";
import { useAppForm } from "@/hooks/use-app-form";
import { resetPassword } from "@/lib/auth-client";
import { submitForm } from "@/lib/form-utils";
import { resetPasswordSchema } from "@/lib/validations/auth";

const searchSchema = z.object({
	token: z.string().optional(),
});

export const Route = createFileRoute("/_auth/reset-password")({
	validateSearch: searchSchema,
	component: ResetPasswordPage,
});

function ResetPasswordPage() {
	const { token } = Route.useSearch();
	const {
		conferenceName,
		conferenceDate,
		conferenceLocation,
		conferenceSubtitle,
	} = Route.useRouteContext();
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

	// No token provided
	if (!token) {
		return (
			<div className="mx-auto flex w-full max-w-3xl overflow-hidden rounded-2xl bg-card shadow-2xl">
				<AuthSidebar
					conferenceName={conferenceName}
					conferenceDate={conferenceDate}
					conferenceLocation={conferenceLocation}
					conferenceSubtitle={conferenceSubtitle}
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
					conferenceSubtitle={conferenceSubtitle}
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
					conferenceSubtitle={conferenceSubtitle}
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
				conferenceSubtitle={conferenceSubtitle}
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
						void submitForm(form);
					}}
					className="flex flex-1 flex-col"
				>
					<div className="flex-1 space-y-3">
						<form.AppField name="newPassword">
							{(field) => (
								<field.PasswordField
									label="New Password"
									description="Min. 10 characters"
								/>
							)}
						</form.AppField>

						<form.AppField name="confirmPassword">
							{(field) => <field.PasswordField label="Confirm Password" />}
						</form.AppField>
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
