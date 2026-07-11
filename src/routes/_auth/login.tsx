import { IconFingerprint, IconMail } from "@tabler/icons-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { AuthCard } from "@/features/auth/components/auth-card";
import { loginSchema } from "@/features/auth/validations";
import { useAppForm } from "@/shared/hooks/use-app-form";
import { authClient, signIn } from "@/shared/lib/auth-client";
import { Button } from "@/shared/ui/button";

export const Route = createFileRoute("/_auth/login")({
	component: LoginPage,
});

async function signInWithPasskey(opts?: { autoFill?: boolean }) {
	const res = await authClient.signIn.passkey(opts);
	if (res?.error) {
		// autoFill stays pending until the user picks a passkey; its abort/cancel
		// is not a real failure, so only surface errors from the explicit button.
		if (!opts?.autoFill) {
			toast.error(res.error.message ?? "Passkey sign-in failed");
		}
		return false;
	}
	toast.success("Logged in successfully");
	return true;
}

function LoginPage() {
	const navigate = useNavigate();

	// Conditional UI: offer passkeys in the e-mail field's autofill dropdown.
	useEffect(() => {
		if (typeof PublicKeyCredential === "undefined") return;
		void PublicKeyCredential.isConditionalMediationAvailable?.().then(
			async (ok) => {
				if (ok && (await signInWithPasskey({ autoFill: true }))) {
					navigate({ to: "/" });
				}
			},
		);
	}, [navigate]);

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
								autoComplete="username webauthn"
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

				<div className="mt-4 space-y-3">
					<form.AppForm>
						<form.SubmitButton
							label="Sign in"
							submittingLabel="Signing in..."
							className="h-9 w-full"
						/>
					</form.AppForm>

					<Button
						type="button"
						variant="outline"
						className="h-9 w-full"
						data-testid="passkey-signin"
						onClick={async () => {
							if (await signInWithPasskey()) navigate({ to: "/" });
						}}
					>
						<IconFingerprint className="size-4" />
						Sign in with passkey
					</Button>
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
