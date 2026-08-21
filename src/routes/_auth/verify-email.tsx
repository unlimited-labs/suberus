import { IconMail, IconRefresh } from "@tabler/icons-react";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import { AuthCard } from "@/features/auth/components/auth-card";
import { useResendVerification } from "@/shared/hooks/use-resend-verification";
import { Button } from "@/shared/ui/button";

const searchSchema = z.object({
	email: z.string().optional(),
});

export const Route = createFileRoute("/_auth/verify-email")({
	validateSearch: searchSchema,
	component: VerifyEmailPage,
});

function VerifyEmailPage() {
	const { email } = useSearch({ from: "/_auth/verify-email" });
	const { cooldown, isResending, resend, disabled } =
		useResendVerification(email);

	return (
		<AuthCard title="Check your email">
			<div className="flex flex-1 flex-col items-center justify-center space-y-6 text-center">
				<div className="rounded-full bg-primary/10 p-4">
					<IconMail
						className="size-12 text-primary"
						data-testid="verify-email-icon"
					/>
				</div>

				<div className="space-y-2">
					<h2 className="text-lg font-semibold lg:hidden">Check your email</h2>
					<p className="text-sm text-muted-foreground">
						We've sent a verification link to
					</p>
					{email && <p className="font-medium text-foreground">{email}</p>}
				</div>

				<div className="space-y-2 text-sm text-muted-foreground">
					<p>Click the link in your email to verify your account.</p>
					<p>The link expires in 24 hours.</p>
				</div>

				{email && (
					<Button
						className="gap-2"
						disabled={disabled}
						onClick={resend}
						variant="outline"
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
				<Link className="font-medium text-primary hover:underline" to="/login">
					Back to login
				</Link>
			</p>
		</AuthCard>
	);
}
