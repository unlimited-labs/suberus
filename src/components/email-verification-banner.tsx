import { IconAlertTriangle, IconRefresh, IconX } from "@tabler/icons-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertAction } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { sendVerificationEmail } from "@/lib/auth-client";
import { useSession } from "@/hooks/use-session";

const RESEND_COOLDOWN = 60;
const DISMISS_KEY = "email-verification-banner-dismissed";

export function EmailVerificationBanner() {
	const { user } = useSession();
	const [isDismissed, setIsDismissed] = useState(false);
	const [cooldown, setCooldown] = useState(0);
	const [isResending, setIsResending] = useState(false);

	useEffect(() => {
		const dismissed = sessionStorage.getItem(DISMISS_KEY);
		if (dismissed === "true") {
			setIsDismissed(true);
		}
	}, []);

	useEffect(() => {
		if (cooldown <= 0) return;

		const timer = setInterval(() => {
			setCooldown((prev) => prev - 1);
		}, 1000);

		return () => clearInterval(timer);
	}, [cooldown]);

	if (!user || user.emailVerified || isDismissed) {
		return null;
	}

	const handleResend = async () => {
		if (cooldown > 0 || isResending) return;

		setIsResending(true);
		try {
			const result = await sendVerificationEmail({ email: user.email });
			if (result.error) {
				toast.error(result.error.message ?? "Failed to send email");
			} else {
				toast.success("Verification email sent");
				setCooldown(RESEND_COOLDOWN);
			}
		} catch {
			toast.error("Failed to send email");
		} finally {
			setIsResending(false);
		}
	};

	const handleDismiss = () => {
		sessionStorage.setItem(DISMISS_KEY, "true");
		setIsDismissed(true);
	};

	return (
		<Alert className="rounded-none border-x-0 border-t-0 border-yellow-500 bg-yellow-500/10">
			<IconAlertTriangle className="size-4 text-yellow-600" />
			<AlertDescription className="text-yellow-700 dark:text-yellow-400">
				Your email is not verified. Some features may be limited.{" "}
				<button
					type="button"
					onClick={handleResend}
					disabled={cooldown > 0 || isResending}
					className="inline-flex items-center gap-1 font-medium underline underline-offset-2 hover:no-underline disabled:opacity-50"
				>
					<IconRefresh
						className={`size-3 ${isResending ? "animate-spin" : ""}`}
					/>
					{cooldown > 0
						? `Resend in ${cooldown}s`
						: isResending
							? "Sending..."
							: "Resend email"}
				</button>
			</AlertDescription>
			<AlertAction>
				<Button
					variant="ghost"
					size="icon"
					className="size-6 text-yellow-700 hover:bg-yellow-500/20 hover:text-yellow-800 dark:text-yellow-400"
					onClick={handleDismiss}
				>
					<IconX className="size-4" />
					<span className="sr-only">Dismiss</span>
				</Button>
			</AlertAction>
		</Alert>
	);
}
