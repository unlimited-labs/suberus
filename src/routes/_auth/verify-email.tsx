import { IconMail, IconRefresh } from "@tabler/icons-react";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { AuthSidebar } from "@/components/forms/auth-sidebar";
import { Button } from "@/components/ui/button";
import { sendVerificationEmail } from "@/lib/auth-client";

const searchSchema = z.object({
	email: z.string().optional(),
});

export const Route = createFileRoute("/_auth/verify-email")({
	validateSearch: searchSchema,
	component: VerifyEmailPage,
});

const RESEND_COOLDOWN = 60;

function VerifyEmailPage() {
	const { email } = useSearch({ from: "/_auth/verify-email" });
	const [cooldown, setCooldown] = useState(0);
	const [isResending, setIsResending] = useState(false);

	useEffect(() => {
		if (cooldown <= 0) return;

		const timer = setInterval(() => {
			setCooldown((prev) => prev - 1);
		}, 1000);

		return () => clearInterval(timer);
	}, [cooldown]);

	const handleResend = async () => {
		if (!email || cooldown > 0 || isResending) return;

		setIsResending(true);
		try {
			const result = await sendVerificationEmail({ email });
			if (result.error) {
				toast.error(result.error.message ?? "Failed to resend email");
			} else {
				toast.success("Verification email sent");
				setCooldown(RESEND_COOLDOWN);
			}
		} catch {
			toast.error("Failed to resend email");
		} finally {
			setIsResending(false);
		}
	};

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
					<h1 className="text-xl font-semibold tracking-tight">
						Check your email
					</h1>
				</div>

				<div className="flex flex-1 flex-col items-center justify-center space-y-6 text-center">
					<div className="rounded-full bg-primary/10 p-4">
						<IconMail className="size-12 text-primary" />
					</div>

					<div className="space-y-2">
						<h2 className="text-lg font-semibold lg:hidden">
							Check your email
						</h2>
						<p className="text-sm text-muted-foreground">
							We've sent a verification link to
						</p>
						{email && (
							<p className="font-medium text-foreground">{email}</p>
						)}
					</div>

					<div className="space-y-2 text-sm text-muted-foreground">
						<p>Click the link in your email to verify your account.</p>
						<p>The link expires in 24 hours.</p>
					</div>

					{email && (
						<Button
							variant="outline"
							onClick={handleResend}
							disabled={cooldown > 0 || isResending}
							className="gap-2"
						>
							<IconRefresh
								className={`size-4 ${isResending ? "animate-spin" : ""}`}
							/>
							{cooldown > 0
								? `Resend in ${cooldown}s`
								: isResending
									? "Sending..."
									: "Resend email"}
						</Button>
					)}
				</div>

				<p className="mt-4 text-center text-sm text-muted-foreground">
					<Link to="/login" className="font-medium text-primary hover:underline">
						Back to login
					</Link>
				</p>
			</div>
		</div>
	);
}
