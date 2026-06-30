import { IconAlertTriangle, IconRefresh, IconX } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useResendVerification } from "@/shared/hooks/use-resend-verification";
import { useSession } from "@/shared/hooks/use-session";
import { Alert, AlertAction, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";

const DISMISS_KEY = "email-verification-banner-dismissed";

export function EmailVerificationBanner() {
	const { user } = useSession();
	const [isDismissed, setIsDismissed] = useState(false);
	const { cooldown, isResending, resend, disabled } = useResendVerification(
		user?.email,
	);

	useEffect(() => {
		const dismissed = sessionStorage.getItem(DISMISS_KEY);
		if (dismissed === "true") {
			setIsDismissed(true);
		}
	}, []);

	if (!user || user.emailVerified || isDismissed) {
		return null;
	}

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
					onClick={resend}
					disabled={disabled}
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
