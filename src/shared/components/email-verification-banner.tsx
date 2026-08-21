import { IconAlertTriangle, IconRefresh, IconX } from "@tabler/icons-react";
import { useSyncExternalStore } from "react";
import { useResendVerification } from "@/shared/hooks/use-resend-verification";
import { useSession } from "@/shared/hooks/use-session";
import { Alert, AlertAction, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";

const DISMISS_KEY = "email-verification-banner-dismissed";
const DISMISS_EVENT = "email-verification-banner-dismiss";

const subscribeDismissed = (onChange: () => void) => {
	window.addEventListener(DISMISS_EVENT, onChange);
	return () => window.removeEventListener(DISMISS_EVENT, onChange);
};
const getDismissedSnapshot = () =>
	sessionStorage.getItem(DISMISS_KEY) === "true";
const getServerDismissedSnapshot = () => false;

const handleDismiss = () => {
	sessionStorage.setItem(DISMISS_KEY, "true");
	window.dispatchEvent(new Event(DISMISS_EVENT));
};

export function EmailVerificationBanner() {
	const { user } = useSession();
	const isDismissed = useSyncExternalStore(
		subscribeDismissed,
		getDismissedSnapshot,
		getServerDismissedSnapshot,
	);
	const { cooldown, isResending, resend, disabled } = useResendVerification(
		user?.email,
	);

	if (!user || user.emailVerified || isDismissed) {
		return null;
	}

	return (
		<Alert className="rounded-none border-x-0 border-t-0 border-yellow-500 bg-yellow-500/10">
			<IconAlertTriangle className="size-4 text-yellow-600" />
			<AlertDescription className="text-yellow-700 dark:text-yellow-400">
				Your email is not verified. Some features may be limited.{" "}
				<button
					className="inline-flex items-center gap-1 font-medium underline underline-offset-2 hover:no-underline disabled:opacity-50"
					disabled={disabled}
					onClick={resend}
					type="button"
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
					className="size-6 text-yellow-700 hover:bg-yellow-500/20 hover:text-yellow-800 dark:text-yellow-400"
					onClick={handleDismiss}
					size="icon"
					variant="ghost"
				>
					<IconX className="size-4" />
					<span className="sr-only">Dismiss</span>
				</Button>
			</AlertAction>
		</Alert>
	);
}
