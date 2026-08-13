import { IconAlertTriangle, IconCheck, IconUpload } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { z } from "zod";
import { AuthLayout } from "@/features/auth/components/auth-layout";
import { getAuthPageBrandingFn } from "@/features/settings/api/settings";
import { APP_SETTINGS_DEFAULTS } from "@/features/settings/defaults";
import { getUploadTarget } from "@/features/submissions/server/upload-target";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

const uploadTargetFn = createServerFn({ method: "GET" })
	.validator(z.object({ token: z.string() }))
	.handler(async ({ data }) => getUploadTarget(data.token));

export const Route = createFileRoute("/upload/$token")({
	beforeLoad: async () => {
		try {
			return await getAuthPageBrandingFn();
		} catch {
			return {
				logoUrl: APP_SETTINGS_DEFAULTS.BRANDING_LOGO_URL,
				authBackgroundUrl: APP_SETTINGS_DEFAULTS.BRANDING_AUTH_BACKGROUND_KEY,
				authBgOverlay: APP_SETTINGS_DEFAULTS.BRANDING_AUTH_BG_OVERLAY,
				logoDarkInvert: APP_SETTINGS_DEFAULTS.BRANDING_LOGO_DARK_INVERT,
			};
		}
	},
	loader: ({ params }) => uploadTargetFn({ data: { token: params.token } }),
	component: UploadPage,
});

function Unavailable({ reason }: { reason: "invalid" | "expired" | "gone" }) {
	const message =
		reason === "expired"
			? "This upload link has expired. Ask the organizer for a new one."
			: reason === "gone"
				? "This submission no longer accepts a file."
				: "This upload link is not valid.";

	return (
		<Card className="w-full max-w-md">
			<CardHeader className="flex-row items-center gap-3 space-y-0">
				<span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
					<IconAlertTriangle className="size-5" />
				</span>
				<CardTitle>Link unavailable</CardTitle>
			</CardHeader>
			<CardContent>
				<p
					className="text-muted-foreground text-sm"
					data-testid="upload-unavailable"
				>
					{message}
				</p>
			</CardContent>
		</Card>
	);
}

function UploadPage() {
	const result = Route.useLoaderData();
	const branding = Route.useRouteContext();
	const { token } = Route.useParams();
	const inputRef = useRef<HTMLInputElement>(null);
	const [state, setState] = useState<"idle" | "sending" | "done">("idle");
	const [error, setError] = useState<string | null>(null);

	const layoutProps = {
		logoUrl: branding.logoUrl,
		backgroundImageUrl: branding.authBackgroundUrl || undefined,
		overlayOpacity: branding.authBgOverlay,
		logoDarkInvert: branding.logoDarkInvert,
	};

	if (!result.ok) {
		return (
			<AuthLayout {...layoutProps}>
				<Unavailable reason={result.reason} />
			</AuthLayout>
		);
	}

	const { target } = result;
	const accept = target.allowedExtensions
		.map((ext: string) => `.${ext}`)
		.join(",");

	const send = async () => {
		const file = inputRef.current?.files?.[0];
		if (!file) return;
		setState("sending");
		setError(null);

		const body = new FormData();
		body.set("file", file);
		const response = await fetch(`/api/submissions/upload/${token}`, {
			method: "POST",
			body,
		});

		if (response.ok) {
			setState("done");
			return;
		}
		setError((await response.text()) || "Upload failed");
		setState("idle");
	};

	return (
		<AuthLayout {...layoutProps}>
			<Card className="mx-auto w-full max-w-md">
				<CardHeader className="flex-row items-center gap-3 space-y-0">
					<span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
						{state === "done" ? (
							<IconCheck className="size-5" />
						) : (
							<IconUpload className="size-5" />
						)}
					</span>
					<CardTitle>
						{state === "done" ? "File received" : "Upload your submission file"}
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="min-w-0">
						<p
							className="truncate font-medium text-sm"
							data-testid="upload-title"
						>
							{target.title}
						</p>
						<p className="text-muted-foreground text-xs">
							{target.allowedExtensions.join(", ").toUpperCase()} · up to{" "}
							{target.maxFileSizeMb} MB
						</p>
					</div>

					{state === "done" ? (
						<p
							className="text-muted-foreground text-sm"
							data-testid="upload-done"
						>
							Thank you — the organizer can see it now. You can close this page.
						</p>
					) : (
						<>
							{target.hasFile && (
								<p className="text-muted-foreground text-xs">
									A file is already attached; uploading replaces it.
								</p>
							)}
							<input
								ref={inputRef}
								type="file"
								accept={accept}
								data-testid="upload-input"
								className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:font-medium file:text-primary file:text-sm"
							/>
							{error && (
								<p
									className="text-destructive text-sm"
									data-testid="upload-error"
								>
									{error}
								</p>
							)}
							<Button
								type="button"
								className="w-full"
								disabled={state === "sending"}
								data-testid="upload-submit"
								onClick={send}
							>
								{state === "sending" ? "Uploading…" : "Upload"}
							</Button>
						</>
					)}
				</CardContent>
			</Card>
		</AuthLayout>
	);
}
