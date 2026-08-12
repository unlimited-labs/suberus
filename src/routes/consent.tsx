import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useSession } from "@/shared/hooks/use-session";
import { Button } from "@/shared/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/shared/ui/card";

export const Route = createFileRoute("/consent")({ component: ConsentPage });

async function submitConsent(accept: boolean): Promise<string> {
	const res = await fetch("/api/auth/oauth2/consent", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		// The authorization query reaches this page signed; it must travel back
		// verbatim, since the provider re-verifies the signature over it.
		body: JSON.stringify({ accept, oauth_query: window.location.search }),
	});
	if (!res.ok) throw new Error(await res.text());
	const data: { redirect_uri?: string } = await res.json();
	if (!data.redirect_uri) throw new Error("Missing redirect_uri in response");
	return data.redirect_uri;
}

function ConsentPage() {
	const router = useRouter();
	const { user, isPending } = useSession();
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const params = new URLSearchParams(
		typeof window === "undefined" ? "" : window.location.search,
	);
	const clientId = params.get("client_id") ?? "";
	const scopes = (params.get("scope") ?? "").split(" ").filter(Boolean);

	const decide = async (accept: boolean) => {
		setBusy(true);
		setError(null);
		try {
			window.location.href = await submitConsent(accept);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Authorization failed");
			setBusy(false);
		}
	};

	if (isPending) return null;

	if (!user) {
		void router.navigate({ to: "/login" });
		return null;
	}

	return (
		<div className="flex min-h-screen items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>Authorize application</CardTitle>
					<CardDescription>
						An application is asking to access Suberus as{" "}
						<strong>{user.email}</strong>.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div>
						<div className="text-muted-foreground text-sm">Application</div>
						<div className="break-all font-medium" data-testid="consent-client">
							{clientId || "Unknown client"}
						</div>
					</div>
					{scopes.length > 0 && (
						<div>
							<div className="text-muted-foreground text-sm">
								Requested access
							</div>
							<ul className="mt-1 list-inside list-disc text-sm">
								{scopes.map((scope) => (
									<li key={scope}>{scope}</li>
								))}
							</ul>
						</div>
					)}
					<p className="text-muted-foreground text-sm">
						Approving lets this application act with your permissions, including
						any administrative access your account holds.
					</p>
					{error && (
						<p className="text-destructive text-sm" data-testid="consent-error">
							{error}
						</p>
					)}
				</CardContent>
				<CardFooter className="flex justify-end gap-2">
					<Button
						variant="outline"
						disabled={busy}
						onClick={() => decide(false)}
						data-testid="consent-deny"
					>
						Deny
					</Button>
					<Button
						disabled={busy}
						onClick={() => decide(true)}
						data-testid="consent-approve"
					>
						Approve
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
