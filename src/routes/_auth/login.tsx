import { IconMail } from "@tabler/icons-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AuthSidebar } from "@/components/forms/auth-sidebar";
import { Button } from "@/components/ui/button";
import { useAppForm } from "@/hooks/use-app-form";
import { signIn } from "@/lib/auth-client";
import { submitForm } from "@/lib/form-utils";
import { loginSchema } from "@/lib/validations/auth";

export const Route = createFileRoute("/_auth/login")({
	component: LoginPage,
});

function LoginPage() {
	const navigate = useNavigate();
	const {
		conferenceName,
		conferenceDate,
		conferenceLocation,
		conferenceSubtitle,
	} = Route.useRouteContext();

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
					<h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
					<p className="text-sm text-muted-foreground">Access your account</p>
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
						{/* Email field */}
						<form.AppField name="email">
							{(field) => (
								<field.IconInputField
									label="E-mail"
									type="email"
									icon={<IconMail className="size-4" />}
								/>
							)}
						</form.AppField>

						{/* Password field */}
						<form.AppField name="password">
							{(field) => <field.PasswordField label="Password" />}
						</form.AppField>

						{/* Remember me + Forgot password */}
						<div className="flex items-center justify-between">
							<form.AppField name="rememberMe">
								{(field) => <field.CheckboxField label="Remember me" />}
							</form.AppField>

							<Link
								to="/forgot-password"
								className="text-sm text-primary hover:underline"
							>
								Forgot password?
							</Link>
						</div>
					</div>

					{/* Submit button */}
					<div className="mt-4">
						<Button
							type="submit"
							className="h-9 w-full"
							disabled={form.state.isSubmitting}
						>
							{form.state.isSubmitting ? "Signing in..." : "Sign in"}
						</Button>
					</div>
				</form>

				{/* Register link */}
				<p className="mt-3 text-center text-sm text-muted-foreground">
					Don't have an account?{" "}
					<Link
						to="/register"
						className="font-medium text-primary hover:underline"
					>
						Create one
					</Link>
				</p>
			</div>
		</div>
	);
}
