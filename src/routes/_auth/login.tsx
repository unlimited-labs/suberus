import { createFileRoute, Link } from "@tanstack/react-router"
import { useForm } from "@tanstack/react-form"
import { IconMail } from "@tabler/icons-react"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { AuthSidebar } from "@/components/forms/auth-sidebar"
import { IconInput } from "@/components/forms/icon-input"
import { PasswordInput } from "@/components/forms/password-input"
import { FieldError } from "@/components/forms/field-error"
import { useZodFormField } from "@/hooks/use-zod-form-field"

export const Route = createFileRoute("/_auth/login")({
	component: LoginPage,
})

const emailSchema = z.string().min(1, "Email is required").email("Invalid email address")
const passwordSchema = z.string().min(1, "Password is required")

function LoginPage() {
	const emailValidators = useZodFormField(emailSchema)
	const passwordValidators = useZodFormField(passwordSchema)

	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
			rememberMe: false,
		},
		onSubmit: async ({ value }) => {
			console.log("Login form submitted:", value)
		},
	})

	return (
		<div className="mx-auto flex w-full max-w-3xl overflow-hidden rounded-2xl bg-card shadow-2xl">
			<AuthSidebar />
			<div className="flex flex-1 flex-col bg-card p-5 text-foreground sm:p-6 lg:p-8">
				{/* Mobile header */}
				<div className="mb-4 lg:hidden">
					<h1 className="text-lg font-bold">KomPlasTech 2025</h1>
				</div>

				{/* Desktop header */}
				<div className="mb-4 hidden lg:block">
					<h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
					<p className="text-sm text-muted-foreground">Access your account</p>
				</div>

				<form
					onSubmit={(e) => {
						e.preventDefault()
						e.stopPropagation()
						void form.handleSubmit()
					}}
					className="flex flex-1 flex-col"
				>
					<div className="flex-1 space-y-3">
						{/* Email field */}
						<form.Field name="email" validators={emailValidators}>
							{(field) => (
								<div className="space-y-1">
									<Label htmlFor={field.name}>E-mail</Label>
									<IconInput
										id={field.name}
										type="email"
										icon={<IconMail className="size-4" />}
										hasError={field.state.meta.errors.length > 0}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
									/>
									<FieldError errors={field.state.meta.errors} />
								</div>
							)}
						</form.Field>

						{/* Password field */}
						<form.Field name="password" validators={passwordValidators}>
							{(field) => (
								<div className="space-y-1">
									<Label htmlFor={field.name}>Password</Label>
									<PasswordInput
										id={field.name}
										hasError={field.state.meta.errors.length > 0}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(value) => field.handleChange(value)}
									/>
									<FieldError errors={field.state.meta.errors} />
								</div>
							)}
						</form.Field>

						{/* Remember me + Forgot password */}
						<div className="flex items-center justify-between">
							<form.Field name="rememberMe">
								{(field) => (
									<div className="flex items-center gap-2">
										<Checkbox
											id={field.name}
											checked={field.state.value}
											onCheckedChange={(checked) => field.handleChange(checked === true)}
										/>
										<Label
											htmlFor={field.name}
											className="cursor-pointer text-sm font-normal text-muted-foreground"
										>
											Remember me
										</Label>
									</div>
								)}
							</form.Field>

							<Link to="/forgot-password" className="text-sm text-primary hover:underline">
								Forgot password?
							</Link>
						</div>
					</div>

					{/* Submit button */}
					<div className="mt-4">
						<Button type="submit" className="h-9 w-full" disabled={form.state.isSubmitting}>
							{form.state.isSubmitting ? "Signing in..." : "Sign in"}
						</Button>
					</div>
				</form>

				{/* Register link */}
				<p className="mt-3 text-center text-sm text-muted-foreground">
					Don't have an account?{" "}
					<Link to="/register" className="font-medium text-primary hover:underline">
						Create one
					</Link>
				</p>
			</div>
		</div>
	)
}
