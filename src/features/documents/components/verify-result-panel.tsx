import { IconShieldCheck, IconShieldX } from "@tabler/icons-react";
import type { VerifyResult } from "@/shared/server/pdf-signing-client";

function verdictLabel(
	result: VerifyResult,
	authentic: boolean,
	intactButForeign: boolean,
): string {
	if (authentic) return "Authentic";
	if (intactButForeign) return "Not issued by this conference";
	if (result.signed) return "Signature could not be confirmed";
	return "Not digitally signed";
}

function AuthenticDetails({ result }: { result: VerifyResult }) {
	return (
		<>
			<dl className="mt-3 grid gap-1 text-sm">
				<div>
					<dt className="text-muted-foreground">Signed by</dt>
					<dd className="break-all">{result.signerSubject}</dd>
				</div>
				{result.signedAt && (
					<div>
						<dt className="text-muted-foreground">Signed at</dt>
						<dd>
							{new Date(result.signedAt).toLocaleString()}
							{result.timestamped && " (trusted timestamp)"}
						</dd>
					</div>
				)}
			</dl>
			<p
				className="mt-3 flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400"
				data-testid="verify-matches-cert"
			>
				<IconShieldCheck className="size-4" />
				Matches this conference's certificate
			</p>
		</>
	);
}

function ForeignWarning({ result }: { result: VerifyResult }) {
	return (
		<div
			className="mt-2 space-y-1 text-sm text-muted-foreground"
			data-testid="verify-foreign"
		>
			<p>
				This PDF carries a valid, unaltered signature, but it was{" "}
				<strong className="text-foreground">not</strong> signed with this
				conference's certificate. Do not trust it as an official document.
			</p>
			{result.signerSubject && (
				<p className="break-all">
					Claimed signer (unverified): {result.signerSubject}
				</p>
			)}
		</div>
	);
}

export function VerifyResultPanel({ result }: { result: VerifyResult }) {
	const cryptoOk = result.signed && result.valid && result.intact;
	// Trust is bound to THIS conference's current certificate, not the cert
	// embedded in the uploaded PDF — otherwise any self-signed forgery with a
	// spoofed subject would read as "Authentic".
	const authentic = Boolean(cryptoOk && result.matchesConfiguredCert);
	const intactButForeign = Boolean(cryptoOk && !result.matchesConfiguredCert);

	return (
		<div
			className={
				authentic
					? "rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4"
					: "rounded-xl border border-amber-500/40 bg-amber-500/5 p-4"
			}
			data-testid="verify-result"
		>
			<div className="flex items-center gap-2">
				{authentic ? (
					<IconShieldCheck className="size-6 text-emerald-600 dark:text-emerald-400" />
				) : (
					<IconShieldX className="size-6 text-amber-600 dark:text-amber-400" />
				)}
				<span className="font-semibold" data-testid="verify-verdict">
					{verdictLabel(result, authentic, intactButForeign)}
				</span>
			</div>

			{authentic && <AuthenticDetails result={result} />}
			{intactButForeign && <ForeignWarning result={result} />}
			{!authentic && !intactButForeign && (
				<p className="mt-2 text-sm text-muted-foreground">{result.reason}</p>
			)}
		</div>
	);
}
