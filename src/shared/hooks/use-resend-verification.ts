import { useEffect, useState } from "react";
import { toast } from "sonner";
import { sendVerificationEmail } from "@/shared/lib/auth-client";

const RESEND_COOLDOWN = 60;

export function useResendVerification(email: string | undefined) {
	const [cooldown, setCooldown] = useState(0);
	const [isResending, setIsResending] = useState(false);

	useEffect(() => {
		if (cooldown <= 0) return;
		const timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
		return () => clearInterval(timer);
	}, [cooldown]);

	const resend = async () => {
		if (!email || cooldown > 0 || isResending) return;
		setIsResending(true);
		try {
			const result = await sendVerificationEmail({ email });
			if (result.error) {
				toast.error(result.error.message ?? "Failed to send email");
			} else {
				toast.success("Verification email sent");
				setCooldown(RESEND_COOLDOWN);
			}
		} catch {
			toast.error("Failed to send email");
		}
		setIsResending(false);
	};

	return {
		cooldown,
		isResending,
		resend,
		disabled: cooldown > 0 || isResending,
	};
}
