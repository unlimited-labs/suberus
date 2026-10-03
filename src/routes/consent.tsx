import { IconAlertTriangle, IconCheck } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AuthLayout } from "@/features/auth/components/auth-layout";
import { consentRequestQueryOptions } from "@/features/mcp/api/consent";
import { scopeLabel } from "@/features/mcp/labels";
import { getAuthPageBrandingFn } from "@/features/settings/api/settings";
import { APP_SETTINGS_DEFAULTS } from "@/features/settings/defaults";
import { useSession } from "@/shared/hooks/use-session";
import { Button } from "@/shared/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/shared/ui/card";

export const Route = createFileRoute("/consent")({
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
	component: ConsentPage,
});

const INVALID_REQUEST_MESSAGE =
	"This authorization link is invalid or has expired. Return to the application and connect again.";

function consentErrorMessage(body: string): string {
	return body.includes("invalid_signature") ? INVALID_REQUEST_MESSAGE : body;
}

async function submitConsent(accept: boolean): Promise<string> {
	const res = await fetch("/api/auth/oauth2/consent", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		// Signed by the provider and re-verified there — must travel back verbatim.
		body: JSON.stringify({ accept, oauth_query: window.location.search }),
	});
	if (!res.ok) throw new Error(consentErrorMessage(await res.text()));
	// Documented as `redirect_uri`; non-navigation callers get the envelope.
	const data: { redirect_uri?: string; url?: string } = await res.json();
	const target = data.redirect_uri ?? data.url;
	if (!target) throw new Error("Authorization server returned no redirect");
	return target;
}

function ConsentPage() {
	const branding = Route.useRouteContext();
	const { user, isPending } = useSession();
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState<"approve" | "deny" | null>(null);

	// Raw, not router search: re-serialising reorders and re-encodes the signed params.
	const search = "window" in globalThis ? window.location.search : "";

	const { data: request, isError } = useQuery({
		...consentRequestQueryOptions(search),
		enabled: Boolean(search) && Boolean(user),
	});

	const decide = async (accept: boolean) => {
		setBusy(accept ? "approve" : "deny");
		setError(null);
		try {
			window.location.href = await submitConsent(accept);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Authorization failed");
			setBusy(null);
		}
	};

	if (isPending) return null;
	if (user && search && !request && !isError) return null;

	const client = request?.valid ? request : null;
	const appName = client?.name || "Unknown application";

	const card = !user ? (
		<Card className="mx-auto w-full max-w-md" data-testid="consent-signed-out">
			<CardHeader>
				<CardTitle className="text-xl">Sign in to continue</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<p className="text-muted-foreground text-sm">
					Your session has ended. Sign in and this authorization request
					continues where it left off.
				</p>
				<Button asChild className="w-full">
					{/* Carries the signed query so /login can re-enter authorize. */}
					<a href={`/login${search}`}>Sign in</a>
				</Button>
			</CardContent>
		</Card>
	) : !client ? (
		<Card className="mx-auto w-full max-w-md" data-testid="consent-invalid">
			<CardHeader>
				<CardTitle className="text-xl">Authorization link not valid</CardTitle>
			</CardHeader>
			<CardContent>
				<p className="text-muted-foreground text-sm">
					{INVALID_REQUEST_MESSAGE}
				</p>
			</CardContent>
		</Card>
	) : (
		<Card className="mx-auto w-full max-w-md" data-testid="consent-card">
			<CardHeader className="gap-1">
				<CardTitle className="text-xl" data-testid="consent-client">
					Authorize {appName}
				</CardTitle>
				{client.origin && (
					<p className="text-muted-foreground text-sm">
						Identity verified at{" "}
						<span className="text-foreground font-medium">{client.origin}</span>
					</p>
				)}
			</CardHeader>

			<CardContent className="space-y-5">
				<div className="flex gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
					<IconAlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-500" />
					<p className="text-sm">
						This application will act as{" "}
						<span className="font-medium">{user.email}</span>, with every
						permission your account holds.
					</p>
				</div>

				{client.scopes.length > 0 && (
					<div className="space-y-2">
						<div className="text-sm font-medium">It will be able to</div>
						<ul className="space-y-1.5">
							{client.scopes.map((scope) => (
								<li className="flex items-start gap-2 text-sm" key={scope}>
									<IconCheck className="text-muted-foreground mt-0.5 size-4 shrink-0" />
									<span>{scopeLabel(scope)}</span>
								</li>
							))}
						</ul>
					</div>
				)}

				{error && (
					<p className="text-destructive text-sm" data-testid="consent-error">
						{error}
					</p>
				)}
			</CardContent>

			<CardFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
				<Button
					className="w-full sm:w-auto"
					data-testid="consent-deny"
					disabled={busy !== null}
					onClick={() => decide(false)}
					variant="outline"
				>
					{busy === "deny" ? "Cancelling..." : "Deny"}
				</Button>
				<Button
					className="w-full sm:w-auto"
					data-testid="consent-approve"
					disabled={busy !== null}
					onClick={() => decide(true)}
				>
					{busy === "approve" ? "Authorizing..." : "Approve"}
				</Button>
			</CardFooter>
		</Card>
	);

	return (
		<AuthLayout
			backgroundImageUrl={branding.authBackgroundUrl || undefined}
			logoDarkInvert={branding.logoDarkInvert}
			logoUrl={branding.logoUrl}
			overlayOpacity={branding.authBgOverlay}
		>
			{card}
		</AuthLayout>
	);
}
