import { IconArrowLeft, IconMail, IconMailCheck } from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AuthCard } from "@/features/auth/components/auth-card";
import { useAppForm } from "@/shared/hooks/use-app-form";
import { forgetPassword } from "@/shared/lib/auth-client";
import { forgotPasswordSchema } from "@/features/auth/validations";

export const Route = createFileRoute("/_auth/forgot-password")({
	component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
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
			<AuthCard centered>
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
			</AuthCard>
		);
	}

	return (
		<AuthCard
			title="Forgot password?"
			subtitle="Enter your email and we'll send you a reset link"
		>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					void form.handleSubmit();
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
					<form.AppForm>
						<form.SubmitButton
							label="Send reset link"
							submittingLabel="Sending..."
							className="h-9 w-full"
						/>
					</form.AppForm>
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
		</AuthCard>
	);
}
