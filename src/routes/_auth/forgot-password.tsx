import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useForm } from "@tanstack/react-form"
import { IconMail, IconArrowLeft, IconMailCheck } from "@tabler/icons-react"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/_auth/forgot-password")({
	component: ForgotPasswordPage,
})

const emailSchema = z.string().min(1, "Email is required").email("Invalid email address")

function ForgotPasswordPage() {
	const [isSubmitted, setIsSubmitted] = useState(false)
	const [submittedEmail, setSubmittedEmail] = useState("")

	const form = useForm({
		defaultValues: {
			email: "",
		},
		onSubmit: async ({ value }) => {
			// UI only - just log the form data and show success state
			console.log("Forgot password form submitted:", value)
			setSubmittedEmail(value.email)
			setIsSubmitted(true)
		},
	})

	// Success state
	if (isSubmitted) {
		return (
			<Card className="mx-auto w-full max-w-md border-border/40 bg-card/70 shadow-2xl backdrop-blur-xl">
				<CardHeader className="space-y-4 text-center">
					<div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10">
						<IconMailCheck className="size-8 text-primary" />
					</div>
					<CardTitle className="font-serif text-2xl tracking-tight sm:text-3xl">
						Check your email
					</CardTitle>
					<CardDescription className="text-muted-foreground">
						We've sent a password reset link to{" "}
						<span className="font-medium text-foreground">{submittedEmail}</span>
					</CardDescription>
				</CardHeader>

				<CardContent className="space-y-4">
					<p className="text-center text-sm text-muted-foreground">
						Didn't receive the email? Check your spam folder or{" "}
						<button
							type="button"
							onClick={() => setIsSubmitted(false)}
							className="text-primary hover:underline"
						>
							try again
						</button>
					</p>
				</CardContent>

				<CardFooter className="justify-center border-t bg-muted/30">
					<Link
						to="/login"
						className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
					>
						<IconArrowLeft className="size-4" />
						Back to login
					</Link>
				</CardFooter>
			</Card>
		)
	}

	return (
		<Card className="mx-auto w-full max-w-md border-border/40 bg-card/70 shadow-2xl backdrop-blur-xl">
			<CardHeader className="space-y-2 text-center">
				<CardTitle className="font-serif text-2xl tracking-tight sm:text-3xl">
					Forgot password?
				</CardTitle>
				<CardDescription className="text-muted-foreground">
					Enter your email and we'll send you a reset link
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

					{/* Submit button */}
					<Button
						type="submit"
						className="h-10 w-full transition-all duration-200 hover:scale-[1.02] hover:brightness-110"
						disabled={form.state.isSubmitting}
					>
						{form.state.isSubmitting ? "Sending..." : "Send reset link"}
					</Button>
				</form>
			</CardContent>

			<CardFooter className="justify-center border-t bg-muted/30">
				<Link
					to="/login"
					className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
				>
					<IconArrowLeft className="size-4" />
					Back to login
				</Link>
			</CardFooter>
		</Card>
	)
}
