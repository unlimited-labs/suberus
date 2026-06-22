import {
	IconFileText,
	IconLock,
	IconMailX,
	IconRefresh,
} from "@tabler/icons-react";
import {
	useQuery,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { userDashboardQueryOptions } from "@/features/dashboard/api/user-dashboard";
import { extractionSettingsQueryOptions } from "@/features/extraction/api/extraction";
import {
	activeSubmissionTypesQueryOptions,
	submissionGuidelinesQueryOptions,
	submissionValidationQueryOptions,
} from "@/features/settings/api/settings";
import {
	createSubmission,
	mySubmissionsQueryOptions,
} from "@/features/submissions/api/submissions";
import {
	SubmissionForm,
	type SubmissionFormData,
} from "@/features/submissions/components/form/submission-form";
import { activeTracksQueryOptions } from "@/features/tracks/api/tracks";
import { PageHeader } from "@/shared/components/layout/page-header";
import { useSession } from "@/shared/hooks/use-session";
import { sendVerificationEmail } from "@/shared/lib/auth-client";
import {
	extractZodIssueMessage,
	logClientError,
} from "@/shared/lib/log-client-error";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";

export const Route = createFileRoute("/_app/submissions/new")({
	loader: async ({ context }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(activeSubmissionTypesQueryOptions()),
			context.queryClient.ensureQueryData(submissionValidationQueryOptions()),
			context.queryClient.ensureQueryData(submissionGuidelinesQueryOptions()),
			context.queryClient.ensureQueryData(extractionSettingsQueryOptions()),
		]);
	},
	component: NewSubmissionPage,
});

const RESEND_COOLDOWN = 60;

function getCreateSubmissionErrorMessage(e: unknown): string {
	if (e instanceof Error && e.message === "Request timed out") {
		return "Submission took too long. Check your submissions list before retrying — it may have gone through.";
	}
	return extractZodIssueMessage(e) ?? "Something went wrong. Please try again.";
}

function submissionResultErrorMessage(result: {
	error?: string;
	issues?: { message: string }[];
}): string {
	if (result.issues && result.issues.length > 0)
		return result.issues[0].message;
	return result.error ?? "";
}

async function runCreateSubmission(
	data: SubmissionFormData,
	isDraft: boolean,
): Promise<{ id: string } | null> {
	// FormData so the file (for FILE types) travels with the create call and is
	// validated + attached atomically server-side.
	const formData = new FormData();
	formData.append("type", data.type);
	formData.append("title", data.title);
	formData.append("content", data.content);
	formData.append("authors", JSON.stringify(data.authors));
	formData.append("keywords", JSON.stringify(data.keywords));
	formData.append("contentFormat", data.contentFormat);
	if (data.trackId) formData.append("trackId", data.trackId);
	formData.append("isDraft", String(isDraft));
	if (data.contentFormat === "FILE" && data.file) {
		formData.append("file", data.file);
	}

	let result: Awaited<ReturnType<typeof createSubmission>>;
	try {
		result = await Promise.race([
			createSubmission({ data: formData }),
			new Promise<never>((_, reject) =>
				setTimeout(() => reject(new Error("Request timed out")), 60_000),
			),
		]);
	} catch (e) {
		await logClientError("[submission] createSubmission failed", e);
		toast.error(getCreateSubmissionErrorMessage(e));
		return null;
	}

	if (!result.success) {
		toast.error(submissionResultErrorMessage(result));
		return null;
	}
	return { id: result.id };
}

function NewSubmissionPage() {
	const { data: typeConfigs } = useSuspenseQuery(
		activeSubmissionTypesQueryOptions(),
	);
	const { data: validationSettings } = useSuspenseQuery(
		submissionValidationQueryOptions(),
	);
	const { data: submissionGuidelines } = useSuspenseQuery(
		submissionGuidelinesQueryOptions(),
	);
	const { data: extractionSettings } = useSuspenseQuery(
		extractionSettingsQueryOptions(),
	);
	const { data: availableTracks = [] } = useQuery(activeTracksQueryOptions());
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { user } = useSession();
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
		if (!user || cooldown > 0 || isResending) return;

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

	const createAndUploadFile = async (
		data: SubmissionFormData,
		isDraft: boolean,
	) => {
		const created = await runCreateSubmission(data, isDraft);
		if (!created) return;

		toast.success(isDraft ? "Draft saved" : "Submission created successfully");
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: mySubmissionsQueryOptions().queryKey,
			}),
			queryClient.invalidateQueries({
				queryKey: userDashboardQueryOptions().queryKey,
			}),
		]);
		navigate({ to: "/submissions/$id", params: { id: created.id } });
	};

	const handleSubmit = async (data: SubmissionFormData) => {
		await createAndUploadFile(data, false);
	};

	const handleSaveDraft = async (data: SubmissionFormData) => {
		await createAndUploadFile(data, true);
	};

	if (typeConfigs.length === 0) {
		return (
			<div className="flex h-full flex-col">
				<PageHeader icon={IconFileText} title="New Submission" />
				<div className="flex flex-1 items-center justify-center p-6">
					<div className="text-center">
						<IconLock className="mx-auto size-12 text-muted-foreground/50" />
						<p className="mt-4 text-muted-foreground">
							No submission types are currently available
						</p>
					</div>
				</div>
			</div>
		);
	}

	if (user && !user.emailVerified) {
		return (
			<div className="flex h-full flex-col">
				<PageHeader icon={IconFileText} title="New Submission" />
				<div className="flex flex-1 items-center justify-center p-6">
					<Alert className="max-w-md border-yellow-500 bg-yellow-500/10">
						<IconMailX className="size-5 text-yellow-600" />
						<AlertTitle className="text-yellow-700 dark:text-yellow-400">
							Email verification required
						</AlertTitle>
						<AlertDescription className="text-yellow-700/80 dark:text-yellow-400/80">
							<p className="mb-4">
								You need to verify your email address before creating
								submissions.
							</p>
							<Button
								variant="outline"
								onClick={handleResend}
								disabled={cooldown > 0 || isResending}
								className="gap-2 border-yellow-500 text-yellow-700 hover:bg-yellow-500/20"
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

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconFileText} title="New Submission" />
			<div className="flex-1 overflow-auto p-6">
				<SubmissionForm
					onSubmit={handleSubmit}
					onSaveDraft={handleSaveDraft}
					typeConfigs={typeConfigs}
					validationSettings={validationSettings}
					guidelines={submissionGuidelines}
					extractionEnabled={extractionSettings.enabled}
					availableTracks={availableTracks}
				/>
			</div>
		</div>
	);
}
