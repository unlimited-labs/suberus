import { IconMail } from "@tabler/icons-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AuthCard } from "@/components/layout/auth-card";
import { useAppForm } from "@/hooks/use-app-form";
import { signIn } from "@/lib/auth-client";
import { loginSchema } from "@/lib/validations/auth";

export const Route = createFileRoute("/_auth/login")({
	component: LoginPage,
});

function LoginPage() {
	const navigate = useNavigate();

	const form = useAppForm({
		defaultValues: {
			email: "",
			password: "",
			rememberMe: false,
		},
		validators: {
			onChange: loginSchema,
			onSubmit: loginSchema,
		},
		onSubmit: async ({ value }) => {
			const result = await signIn.email({
				email: value.email,
				password: value.password,
				rememberMe: value.rememberMe,
			});

			if (result.error) {
				toast.error(result.error.message ?? "Invalid credentials");
				return;
			}

			toast.success("Logged in successfully");
			navigate({ to: "/" });
		},
	});

	return (
		<AuthCard title="Sign in" subtitle="Access your account">
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

					<form.AppField name="password">
						{(field) => <field.PasswordField label="Password" />}
					</form.AppField>

					<div className="flex items-center justify-between">
						<form.AppField name="rememberMe">
							{(field) => <field.CheckboxField label="Remember me" />}
						</form.AppField>

						<Link
							to="/forgot-password"
							className="whitespace-nowrap text-sm text-primary hover:underline"
						>
							Forgot password?
						</Link>
					</div>
				</div>

				<div className="mt-4">
					<form.SubmitButton
						label="Sign in"
						submittingLabel="Signing in..."
						className="h-9 w-full"
					/>
				</div>
			</form>

			<p className="mt-3 text-center text-sm text-muted-foreground">
				Don't have an account?{" "}
				<Link
					to="/register"
					className="font-medium text-primary hover:underline"
				>
					Create one
				</Link>
			</p>
		</AuthCard>
	);
}
