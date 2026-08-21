import { IconFileText, IconMailX, IconRefresh } from "@tabler/icons-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { useResendVerification } from "@/shared/hooks/use-resend-verification";
import { useSession } from "@/shared/hooks/use-session";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";

export function SubmissionEmailGate({ title }: { title: string }) {
	const { user } = useSession();
	const { cooldown, isResending, resend, disabled } = useResendVerification(
		user?.email,
	);

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconFileText} title={title} />
			<div className="flex flex-1 items-center justify-center p-6">
				<Alert className="max-w-md border-yellow-500 bg-yellow-500/10">
					<IconMailX className="size-5 text-yellow-600" />
					<AlertTitle className="text-yellow-700 dark:text-yellow-400">
						Email verification required
					</AlertTitle>
					<AlertDescription className="text-yellow-700/80 dark:text-yellow-400/80">
						<p className="mb-4">
							You need to verify your email address before creating submissions.
						</p>
						<Button
							className="gap-2 border-yellow-500 text-yellow-700 hover:bg-yellow-500/20"
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
									: "Resend verification email"}
						</Button>
					</AlertDescription>
				</Alert>
			</div>
		</div>
	);
}
