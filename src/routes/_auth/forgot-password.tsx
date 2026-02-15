import { IconArrowLeft, IconMail, IconMailCheck } from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AuthSidebar } from "@/components/forms/auth-sidebar";
import { Button } from "@/components/ui/button";
import { useAppForm } from "@/hooks/use-app-form";
import { forgetPassword } from "@/lib/auth-client";
import { submitForm } from "@/lib/form-utils";
import { forgotPasswordSchema } from "@/lib/validations/auth";

export const Route = createFileRoute("/_auth/forgot-password")({
	component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
	const {
		conferenceName,
		conferenceDate,
		conferenceLocation,
		conferenceSubtitle,
	} = Route.useRouteContext();
	const [isSubmitted, setIsSubmitted] = useState(false);
	const [submittedEmail, setSubmittedEmail] = useState("");

	const form = useAppForm({
		defaultValues: {
			email: "",
		},
		validators: {
			onChange: forgotPasswordSchema,
			onSubmit: forgotPasswordSchema,
		},
		onSubmit: async ({ value }) => {
			const result = await forgetPassword({
				email: value.email,
				redirectTo: "/reset-password",
			});

			if (result.error) {
				toast.error(result.error.message ?? "Failed to send reset email");
				return;
			}

			setSubmittedEmail(value.email);
			setIsSubmitted(true);
		},
	});

	if (isSubmitted) {
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
							<IconMailCheck className="size-7 text-primary" />
						</div>
						<div>
							<h1 className="text-xl font-semibold tracking-tight">
								Check your email
							</h1>
							<p className="mt-1 text-sm text-muted-foreground">
								We've sent a password reset link to{" "}
								<span className="font-medium text-foreground">
									{submittedEmail}
								</span>
							</p>
						</div>
						<p className="text-sm text-muted-foreground">
							Didn't receive the email? Check your spam folder or{" "}
							<button
								type="button"
								onClick={() => setIsSubmitted(false)}
								className="text-primary hover:underline"
							>
								try again
							</button>
						</p>
						<Link
							to="/login"
							className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
						>
							<IconArrowLeft className="size-4" />
							Back to login
						</Link>
					</div>
				</div>
			</div>
		);
	}

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
						Forgot password?
					</h1>
					<p className="text-sm text-muted-foreground">
						Enter your email and we'll send you a reset link
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
						<form.AppField name="email">
							{(field) => (
								<field.IconInputField
									label="E-mail"
									type="email"
									icon={<IconMail className="size-4" />}
								/>
							)}
						</form.AppField>
					</div>

					<div className="mt-4">
						<Button
							type="submit"
							className="h-9 w-full"
							disabled={form.state.isSubmitting}
						>
							{form.state.isSubmitting ? "Sending..." : "Send reset link"}
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
