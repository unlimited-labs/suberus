import { IconFingerprint, IconMail } from "@tabler/icons-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import { AuthCard } from "@/features/auth/components/auth-card";
import {
	oauthResumeSearch,
	resumeOAuthAuthorize,
} from "@/features/auth/oauth-resume";
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

	const afterSignIn = useCallback(() => {
		const resume = oauthResumeSearch();
		if (resume) resumeOAuthAuthorize(resume);
		else navigate({ to: "/" });
	}, [navigate]);

	// Conditional UI: offer passkeys in the e-mail field's autofill dropdown.
	useEffect(() => {
		if (!("PublicKeyCredential" in globalThis)) return;
		void PublicKeyCredential.isConditionalMediationAvailable?.().then(
			async (ok) => {
				if (ok && (await signInWithPasskey({ autoFill: true }))) afterSignIn();
			},
		);
	}, [afterSignIn]);

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
			afterSignIn();
		},
	});

	return (
		<AuthCard subtitle="Access your account" title="Sign in">
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
								autoComplete="username webauthn"
								icon={<IconMail className="size-4" />}
								label="E-mail"
								type="email"
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
							className="text-primary text-sm whitespace-nowrap hover:underline"
							to="/forgot-password"
						>
							Forgot password?
						</Link>
					</div>
				</div>

				<div className="mt-4 space-y-3">
					<form.AppForm>
						<form.SubmitButton
							className="h-9 w-full"
							label="Sign in"
							submittingLabel="Signing in..."
						/>
					</form.AppForm>

					<Button
						className="h-9 w-full"
						data-testid="passkey-signin"
						onClick={async () => {
							if (await signInWithPasskey()) afterSignIn();
						}}
						type="button"
						variant="outline"
					>
						<IconFingerprint className="size-4" />
						Sign in with passkey
					</Button>
				</div>
			</form>

			<p className="text-muted-foreground mt-3 text-center text-sm">
				Don't have an account?{" "}
				<Link
					className="text-primary font-medium hover:underline"
					to="/register"
				>
					Create one
				</Link>
			</p>
		</AuthCard>
	);
}
