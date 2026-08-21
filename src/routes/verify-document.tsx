import { IconLoader2, IconUpload } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { VerifyResultPanel } from "@/features/documents/components/verify-result-panel";
import { verifyDocumentFn } from "@/features/settings/api/document-signing";
import { getAppBrandingFn } from "@/features/settings/api/settings";
import { getErrorMessage } from "@/shared/lib/error-message";
import type { VerifyResult } from "@/shared/server/pdf-signing-client";
import { Button } from "@/shared/ui/button";

export const Route = createFileRoute("/verify-document")({
	head: async () => {
		const branding = await getAppBrandingFn();
		return {
			meta: [
				{
					title: branding.conferenceName
						? `Verify document — ${branding.conferenceName}`
						: "Verify document",
				},
			],
		};
	},
	component: VerifyDocumentPage,
});

function VerifyDocumentPage() {
	const fileRef = useRef<HTMLInputElement>(null);
	const [busy, setBusy] = useState(false);
	const [result, setResult] = useState<VerifyResult | null>(null);
	const [error, setError] = useState<string | null>(null);

	const verify = async () => {
		const file = fileRef.current?.files?.[0];
		if (!file) {
			setError("Choose a PDF document to verify.");
			return;
		}
		setBusy(true);
		setError(null);
		setResult(null);
		try {
			const form = new FormData();
			form.append("file", file);
			setResult(await verifyDocumentFn({ data: form }));
		} catch (e) {
			setError(getErrorMessage(e, "Could not verify the document."));
		}
		setBusy(false);
	};

	return (
		<div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-4 py-10">
			<div className="text-center">
				<h1 className="text-2xl font-bold tracking-tight">Verify a document</h1>
				<p className="text-muted-foreground mt-2 text-sm">
					Upload a PDF issued by us to confirm it is authentic and has not been
					altered. The file is checked in memory and never stored.
				</p>
			</div>

			<div className="border-border/60 bg-card space-y-4 rounded-2xl border p-6">
				<input
					accept="application/pdf,.pdf"
					aria-label="PDF document to verify"
					className="file:border-border file:bg-muted block w-full text-sm file:mr-3 file:rounded-md file:border file:px-3 file:py-1.5 file:text-sm"
					data-testid="verify-file-input"
					ref={fileRef}
					type="file"
				/>
				<Button
					className="w-full"
					data-testid="verify-submit"
					disabled={busy}
					onClick={verify}
				>
					{busy ? (
						<IconLoader2 className="mr-2 size-4 animate-spin" />
					) : (
						<IconUpload className="mr-2 size-4" />
					)}
					Verify
				</Button>

				{error && <p className="text-destructive text-sm">{error}</p>}

				{result && <VerifyResultPanel result={result} />}
			</div>
		</div>
	);
}
