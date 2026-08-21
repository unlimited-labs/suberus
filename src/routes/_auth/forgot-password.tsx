import { IconArrowLeft, IconMail, IconMailCheck } from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AuthCard } from "@/features/auth/components/auth-card";
import { forgotPasswordSchema } from "@/features/auth/validations";
import { useAppForm } from "@/shared/hooks/use-app-form";
import { forgetPassword } from "@/shared/lib/auth-client";

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
					<div className="bg-primary/10 mx-auto flex size-14 items-center justify-center rounded-full">
						<IconMailCheck className="text-primary size-7" />
					</div>
					<div>
						<h1 className="text-xl font-semibold tracking-tight">
							Check your email
						</h1>
						<p className="text-muted-foreground mt-1 text-sm">
							We've sent a password reset link to{" "}
							<span className="text-foreground font-medium">
								{submittedEmail}
							</span>
						</p>
					</div>
					<p className="text-muted-foreground text-sm">
						Didn't receive the email? Check your spam folder or{" "}
						<button
							className="text-primary hover:underline"
							onClick={() => setIsSubmitted(false)}
							type="button"
						>
							try again
						</button>
					</p>
					<Link
						className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm"
						to="/login"
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
			subtitle="Enter your email and we'll send you a reset link"
			title="Forgot password?"
		>
			<form
				className="flex flex-1 flex-col"
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					void form.handleSubmit();
				}}
			>
				<div className="flex-1 space-y-3">
					<form.AppField name="email">
						{(field) => (
							<field.IconInputField
								icon={<IconMail className="size-4" />}
								label="E-mail"
								type="email"
							/>
						)}
					</form.AppField>
				</div>

				<div className="mt-4">
					<form.AppForm>
						<form.SubmitButton
							className="h-9 w-full"
							label="Send reset link"
							submittingLabel="Sending..."
						/>
					</form.AppForm>
				</div>
			</form>

			<p className="mt-3 text-center">
				<Link
					className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm"
					to="/login"
				>
					<IconArrowLeft className="size-4" />
					Back to login
				</Link>
			</p>
		</AuthCard>
	);
}
