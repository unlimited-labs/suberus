import {
	IconBuilding,
	IconMail,
	IconSettings,
	IconUser,
} from "@tabler/icons-react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AuthLayout } from "@/components/layout/auth-layout";
import { useAppForm } from "@/hooks/use-app-form";
import { installSchema } from "@/lib/validations/install";
import {
	checkInstallStatusFn,
	performInstallFn,
} from "@/server-fns/settings/install";

export const Route = createFileRoute("/install")({
	beforeLoad: async () => {
		const { installed } = await checkInstallStatusFn();
		if (installed) {
			throw redirect({ to: "/login" });
		}
	},
	component: InstallPage,
});

function InstallPage() {
	const navigate = useNavigate();

	const form = useAppForm({
		defaultValues: {
			conferenceName: "",
			email: "",
			password: "",
			confirmPassword: "",
			firstName: "",
			lastName: "",
			affiliation: "",
		},
		validators: {
			onChange: installSchema,
			onSubmit: installSchema,
		},
		onSubmit: async ({ value }) => {
			await performInstallFn({ data: value });
			toast.success("Setup complete! You can now sign in.");
			navigate({ to: "/login" });
		},
	});

	return (
		<AuthLayout logoUrl="" logoDarkInvert>
			<div className="mx-auto flex w-full max-w-lg overflow-hidden rounded-2xl bg-card shadow-2xl">
				<div className="flex flex-1 flex-col bg-card p-5 text-foreground sm:p-6 lg:p-8">
					<div className="mb-5">
						<div className="mb-1 flex items-center gap-2">
							<IconSettings className="size-5 text-primary" />
							<h1 className="text-xl font-semibold tracking-tight">
								Setup Suberus
							</h1>
						</div>
						<p className="text-sm text-muted-foreground">
							Configure your conference management system
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
							{/* Conference Name */}
							<form.AppField name="conferenceName">
								{(field) => (
									<field.IconInputField
										label="Conference Name"
										icon={<IconBuilding className="size-4" />}
									/>
								)}
							</form.AppField>

							{/* Separator */}
							<div className="relative py-1">
								<div className="absolute inset-0 flex items-center">
									<span className="w-full border-t" />
								</div>
								<div className="relative flex justify-center text-xs uppercase">
									<span className="bg-card px-2 text-muted-foreground">
										Admin Account
									</span>
								</div>
							</div>

							{/* Email */}
							<form.AppField name="email">
								{(field) => (
									<field.IconInputField
										label="E-mail"
										type="email"
										icon={<IconMail className="size-4" />}
									/>
								)}
							</form.AppField>

							{/* Password */}
							<form.AppField name="password">
								{(field) => <field.PasswordField label="Password" />}
							</form.AppField>

							{/* Confirm Password */}
							<form.AppField name="confirmPassword">
								{(field) => <field.PasswordField label="Confirm Password" />}
							</form.AppField>

							{/* First Name */}
							<form.AppField name="firstName">
								{(field) => (
									<field.IconInputField
										label="First Name"
										icon={<IconUser className="size-4" />}
									/>
								)}
							</form.AppField>

							{/* Last Name */}
							<form.AppField name="lastName">
								{(field) => (
									<field.IconInputField
										label="Last Name"
										icon={<IconUser className="size-4" />}
									/>
								)}
							</form.AppField>

							{/* Affiliation */}
							<form.AppField name="affiliation">
								{(field) => (
									<field.IconInputField
										label="Affiliation"
										icon={<IconBuilding className="size-4" />}
									/>
								)}
							</form.AppField>
						</div>

						{/* Submit */}
						<div className="mt-5">
							<form.AppForm>
								<form.SubmitButton
									label="Complete Setup"
									submittingLabel="Setting up..."
									className="h-9 w-full"
								/>
							</form.AppForm>
						</div>
					</form>
				</div>
			</div>
		</AuthLayout>
	);
}
