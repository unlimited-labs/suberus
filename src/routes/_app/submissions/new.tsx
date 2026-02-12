import { IconFileText, IconMailX, IconRefresh } from "@tabler/icons-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
	SubmissionForm,
	type SubmissionFormData,
} from "@/components/forms/submission/submission-form";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";
import { sendVerificationEmail } from "@/lib/auth-client";
import {
	getActiveSubmissionTypesFn,
	getSubmissionGuidelinesFn,
	getSubmissionValidationForFormFn,
} from "@/utils/settings.functions";
import {
	createSubmission,
	uploadSubmissionFile,
} from "@/utils/submissions.functions";

export const Route = createFileRoute("/_app/submissions/new")({
	loader: async () => {
		const [typeConfigs, validationSettings, submissionGuidelines] =
			await Promise.all([
				getActiveSubmissionTypesFn(),
				getSubmissionValidationForFormFn(),
				getSubmissionGuidelinesFn(),
			]);
		return { typeConfigs, validationSettings, submissionGuidelines };
	},
	component: NewSubmissionPage,
});

const RESEND_COOLDOWN = 60;

function NewSubmissionPage() {
	const { typeConfigs, validationSettings, submissionGuidelines } =
		Route.useLoaderData();
	const navigate = useNavigate();
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
		let result: Awaited<ReturnType<typeof createSubmission>>;
		try {
			result = await Promise.race([
				createSubmission({
					data: {
						type: data.type,
						title: data.title,
						content: data.content,
						authors: data.authors,
						keywords: data.keywords,
						contentFormat: data.contentFormat,
						sessionId: data.sessionId,
						isDraft,
					},
				}),
				new Promise<never>((_, reject) =>
					setTimeout(() => reject(new Error("Request timed out")), 30_000),
				),
			]);
		} catch {
			toast.error("Something went wrong. Please try again.");
			return;
		}

		if (!result.success) {
			if (result.issues && result.issues.length > 0) {
				toast.error(result.issues[0].message);
			} else {
				toast.error(result.error);
			}
			return;
		}

		// If FILE format with file, upload it
		if (data.contentFormat === "FILE" && data.file) {
			try {
				const buffer = await data.file.arrayBuffer();
				const base64 = btoa(
					new Uint8Array(buffer).reduce(
						(d, byte) => d + String.fromCharCode(byte),
						"",
					),
				);

				const uploadResult = await uploadSubmissionFile({
					data: {
						submissionId: result.id,
						versionNumber: 1,
						fileName: data.file.name,
						mimeType: data.file.type,
						fileBase64: base64,
					},
				});

				if (!uploadResult.success) {
					toast.error(
						`${isDraft ? "Draft saved" : "Submission created"} but file upload failed: ${uploadResult.error}`,
					);
				}
			} catch {
				toast.error("File upload failed");
			}
		}

		toast.success(isDraft ? "Draft saved" : "Submission created successfully");
		navigate({ to: "/submissions/$id", params: { id: result.id } });
	};

	const handleSubmit = async (data: SubmissionFormData) => {
		await createAndUploadFile(data, false);
	};

	const handleSaveDraft = async (data: SubmissionFormData) => {
		await createAndUploadFile(data, true);
	};

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
				/>
			</div>
		</div>
	);
}
