import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useForm } from "@tanstack/react-form"
import { IconMail, IconLock, IconEye, IconEyeOff } from "@tabler/icons-react"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/_auth/login")({
	component: LoginPage,
})

const emailSchema = z.string().min(1, "Email is required").email("Invalid email address")
const passwordSchema = z.string().min(1, "Password is required")

function LoginPage() {
	const [showPassword, setShowPassword] = useState(false)

	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
			rememberMe: false,
		},
		onSubmit: async ({ value }) => {
			// UI only - just log the form data
			console.log("Login form submitted:", value)
		},
	})

	return (
		<Card className="mx-auto w-full max-w-md border-border/40 bg-card/70 shadow-2xl backdrop-blur-xl">
			<CardHeader className="space-y-2 text-center">
				<CardTitle className="font-serif text-2xl tracking-tight sm:text-3xl">
					Welcome back
				</CardTitle>
				<CardDescription className="text-muted-foreground">
					Sign in to your account to continue
				</CardDescription>
			</CardHeader>

			<CardContent>
				<form
					onSubmit={(e) => {
						e.preventDefault()
						e.stopPropagation()
						void form.handleSubmit()
					}}
					className="space-y-4"
				>
					{/* Email field */}
					<form.Field
						name="email"
						validators={{
							onBlur: ({ value }) => {
								const result = emailSchema.safeParse(value)
								return result.success ? undefined : result.error?.issues[0]?.message
							},
							onSubmit: ({ value }) => {
								const result = emailSchema.safeParse(value)
								return result.success ? undefined : result.error?.issues[0]?.message
							},
						}}
					>
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor={field.name}>Email</Label>
								<div className="relative">
									<IconMail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
									<Input
										id={field.name}
										type="email"
										placeholder="name@example.com"
										className={cn(
											"h-10 pl-10 transition-all duration-200",
											"focus:scale-[1.01]",
											field.state.meta.errors.length > 0 && "border-destructive"
										)}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
									/>
								</div>
								{field.state.meta.errors.length > 0 && (
									<p className="text-xs text-destructive">
										{field.state.meta.errors[0]}
									</p>
								)}
							</div>
						)}
					</form.Field>

					{/* Password field */}
					<form.Field
						name="password"
						validators={{
							onBlur: ({ value }) => {
								const result = passwordSchema.safeParse(value)
								return result.success ? undefined : result.error?.issues[0]?.message
							},
							onSubmit: ({ value }) => {
								const result = passwordSchema.safeParse(value)
								return result.success ? undefined : result.error?.issues[0]?.message
							},
						}}
					>
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor={field.name}>Password</Label>
								<div className="relative">
									<IconLock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
									<Input
										id={field.name}
										type={showPassword ? "text" : "password"}
										placeholder="Enter your password"
										className={cn(
											"h-10 pl-10 pr-10 transition-all duration-200",
											"focus:scale-[1.01]",
											field.state.meta.errors.length > 0 && "border-destructive"
										)}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
									/>
									<button
										type="button"
										onClick={() => setShowPassword(!showPassword)}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
									>
										{showPassword ? (
											<IconEyeOff className="size-4" />
										) : (
											<IconEye className="size-4" />
										)}
									</button>
								</div>
								{field.state.meta.errors.length > 0 && (
									<p className="text-xs text-destructive">
										{field.state.meta.errors[0]}
									</p>
								)}
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
										onCheckedChange={(checked) =>
											field.handleChange(checked === true)
										}
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

						<Link
							to="/forgot-password"
							className="text-sm text-primary transition-colors hover:text-primary/80 hover:underline"
						>
							Forgot password?
						</Link>
					</div>

					{/* Submit button */}
					<Button
						type="submit"
						className="h-10 w-full transition-all duration-200 hover:scale-[1.02] hover:brightness-110"
						disabled={form.state.isSubmitting}
					>
						{form.state.isSubmitting ? "Signing in..." : "Sign in"}
					</Button>
				</form>
			</CardContent>

			<CardFooter className="justify-center border-t bg-muted/30">
				<p className="text-sm text-muted-foreground">
					Don't have an account?{" "}
					<Link
						to="/register"
						className="font-medium text-primary transition-colors hover:text-primary/80 hover:underline"
					>
						Create one
					</Link>
				</p>
			</CardFooter>
		</Card>
	)
}
