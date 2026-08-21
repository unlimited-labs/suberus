import {
	IconAlertTriangle,
	IconCertificate,
	IconDownload,
	IconLoader2,
	IconShieldCheck,
	IconUpload,
} from "@tabler/icons-react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
	documentSigningQueryOptions,
	generateSigningCertFn,
	setSigningAppearanceFn,
	setSigningEnabledFn,
	setSigningTimestampFn,
	uploadSigningCertFn,
} from "@/features/settings/api/document-signing";
import { SettingsSection } from "@/features/settings/components/settings-section";
import type { DocumentSigningSettings } from "@/features/settings/types";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { getErrorMessage } from "@/shared/lib/error-message";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";
import { Switch } from "@/shared/ui/switch";

const DEFAULT_TSA_URL = "https://freetsa.org/tsr";
const CORNERS: DocumentSigningSettings["sealCorner"][] = [
	"bottom-right",
	"bottom-left",
	"top-right",
	"top-left",
];

interface Props {
	conferenceName: string;
}

export function DocumentSigningTab({ conferenceName }: Props) {
	const queryClient = useQueryClient();
	const { formatDate } = useDateFormat();
	const { data: cfg } = useSuspenseQuery(documentSigningQueryOptions());
	const invalidate = () =>
		queryClient.invalidateQueries({
			queryKey: documentSigningQueryOptions().queryKey,
		});

	return (
		<div className="space-y-6">
			<CertificateSection
				cfg={cfg}
				conferenceName={conferenceName}
				formatDate={formatDate}
				onChanged={invalidate}
			/>
			{cfg && (
				<>
					<AppearanceSection cfg={cfg} onChanged={invalidate} />
					<TimestampSection cfg={cfg} onChanged={invalidate} />
				</>
			)}
		</div>
	);
}

function daysUntil(iso: string): number {
	return Math.floor((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

const resignAfterRotation = async () => {
	try {
		const res = await fetch("/api/documents/resign", { method: "POST" });
		if (!res.ok) {
			toast.error(
				getErrorMessage(
					new Error(String(res.status)),
					"Certificate rotated, but re-signing failed to start",
				),
			);
			return;
		}
		// SAFETY: shape is the service's documented response contract; a mismatch surfaces on first field read.
		const { count } = (await res.json()) as { count: number };
		if (count > 0) {
			toast.success(
				`Re-signing ${count} previously signed document(s) with the new certificate`,
			);
		}
	} catch (e) {
		toast.error(
			getErrorMessage(e, "Certificate rotated, but re-signing failed to start"),
		);
	}
};

function CertificateSection({
	cfg,
	conferenceName,
	formatDate,
	onChanged,
}: {
	cfg: Omit<DocumentSigningSettings, "passwordSealed" | "p12Base64"> | null;
	conferenceName: string;
	formatDate: (d: Date) => string;
	onChanged: () => Promise<void>;
}) {
	const [commonName, setCommonName] = useState(conferenceName);
	const [org, setOrg] = useState(conferenceName);
	const [validYears, setValidYears] = useState(5);
	const [busy, setBusy] = useState(false);
	const fileRef = useRef<HTMLInputElement>(null);
	const [p12Password, setP12Password] = useState("");
	// When a cert already exists, replacing it is a rotation: confirm first, then
	// re-sign previously-signed documents with the new cert.
	const [confirm, setConfirm] = useState<null | "generate" | "upload">(null);

	const expiresInDays = cfg ? daysUntil(cfg.validUntil) : null;

	const doGenerate = async () => {
		const wasRotation = Boolean(cfg);
		setBusy(true);
		try {
			await generateSigningCertFn({
				data: { commonName, org, validDays: validYears * 365 },
			});
			await onChanged();
			toast.success("Certificate generated");
			if (wasRotation) await resignAfterRotation();
		} catch (e) {
			toast.error(getErrorMessage(e, "Failed to generate certificate"));
		}
		setBusy(false);
		setConfirm(null);
	};

	const doUpload = async () => {
		const file = fileRef.current?.files?.[0];
		if (!file) {
			toast.error("Choose a .p12 file");
			return;
		}
		const wasRotation = Boolean(cfg);
		setBusy(true);
		try {
			const form = new FormData();
			form.append("p12", file);
			form.append("password", p12Password);
			await uploadSigningCertFn({ data: form });
			await onChanged();
			toast.success("Certificate uploaded");
			if (fileRef.current) fileRef.current.value = "";
			setP12Password("");
			if (wasRotation) await resignAfterRotation();
		} catch (e) {
			toast.error(getErrorMessage(e, "Failed to upload certificate"));
		}
		setBusy(false);
		setConfirm(null);
	};

	const generate = () => {
		if (!commonName.trim()) {
			toast.error("Common name is required");
			return;
		}
		if (cfg) {
			setConfirm("generate");
			return;
		}
		void doGenerate();
	};

	const upload = () => {
		if (!fileRef.current?.files?.[0]) {
			toast.error("Choose a .p12 file");
			return;
		}
		if (cfg) {
			setConfirm("upload");
			return;
		}
		void doUpload();
	};

	const toggleEnabled = async (enabled: boolean) => {
		setBusy(true);
		try {
			await setSigningEnabledFn({ data: { enabled } });
			await onChanged();
		} catch (e) {
			toast.error(getErrorMessage(e, "Failed to update"));
		}
		setBusy(false);
	};

	return (
		<SettingsSection
			description="Cryptographically sign generated PDF documents with the conference's identity"
			icon={IconShieldCheck}
			title="Digital signature"
		>
			<div className="space-y-5" data-testid="document-signing-section">
				{cfg ? (
					<div
						className="border-border/60 bg-muted/20 rounded-xl border p-4"
						data-testid="signing-cert-status"
					>
						<div className="mb-3 flex items-center justify-between gap-3">
							<div className="flex items-center gap-2">
								<IconCertificate className="text-primary size-5" />
								<span className="font-medium">Certificate installed</span>
							</div>
							<Badge variant="secondary">
								{cfg.source === "self-signed" ? "Self-signed" : "Uploaded"}
							</Badge>
						</div>
						<dl className="grid gap-1 text-sm sm:grid-cols-2">
							<div>
								<dt className="text-muted-foreground">Subject</dt>
								<dd className="break-all" data-testid="signing-cert-subject">
									{cfg.subject}
								</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Valid until</dt>
								<dd>{formatDate(new Date(cfg.validUntil))}</dd>
							</div>
							<div className="sm:col-span-2">
								<dt className="text-muted-foreground">SHA-256 fingerprint</dt>
								<dd
									className="font-mono text-xs break-all"
									data-testid="signing-cert-fingerprint"
								>
									{cfg.fingerprintSha256}
								</dd>
							</div>
						</dl>
						{expiresInDays !== null && expiresInDays < 30 && (
							<p
								className="mt-3 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400"
								data-testid="signing-cert-expiry-warning"
							>
								<IconAlertTriangle className="size-4 shrink-0" />
								{expiresInDays < 0
									? "This certificate has expired — regenerate it to keep signing."
									: `This certificate expires in ${expiresInDays} day(s) — consider regenerating it.`}
							</p>
						)}
						<div className="mt-4 flex flex-wrap items-center gap-3">
							<Button asChild size="sm" variant="outline">
								<a href="/api/documents/signing-cert">
									<IconDownload className="mr-2 size-4" />
									Download public certificate
								</a>
							</Button>
							<div className="flex items-center gap-2 text-sm">
								<Switch
									checked={cfg.enabled}
									data-testid="signing-enabled-switch"
									disabled={busy}
									id="signing-enabled"
									onCheckedChange={toggleEnabled}
								/>
								<Label className="font-normal" htmlFor="signing-enabled">
									Sign new documents
								</Label>
							</div>
						</div>
						<p className="text-muted-foreground mt-3 text-xs">
							Self-signed signatures prove the document was issued here and was
							not altered. In a PDF reader the signer shows as "not trusted"
							until the verifier imports this certificate — or anyone can
							confirm authenticity on the public verification page.
						</p>
					</div>
				) : (
					<p className="text-muted-foreground text-sm">
						No signing certificate yet. Generate a self-signed one (or upload
						your organization's .p12) to start signing documents.
					</p>
				)}

				<div className="grid gap-6 sm:grid-cols-2">
					<div className="space-y-3">
						<h3 className="text-sm font-semibold">
							{cfg
								? "Regenerate self-signed certificate"
								: "Generate certificate"}
						</h3>
						<div className="space-y-2">
							<Label htmlFor="cn">Common name</Label>
							<Input
								data-testid="signing-common-name"
								id="cn"
								onChange={(e) => setCommonName(e.target.value)}
								value={commonName}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="org">Organization</Label>
							<Input
								id="org"
								onChange={(e) => setOrg(e.target.value)}
								value={org}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="validity">Validity (years)</Label>
							<Input
								className="max-w-[140px]"
								id="validity"
								max={10}
								min={1}
								onChange={(e) => setValidYears(Number(e.target.value))}
								type="number"
								value={validYears}
							/>
						</div>
						<Button
							data-testid="generate-cert-button"
							disabled={busy}
							onClick={generate}
							size="sm"
						>
							{busy && <IconLoader2 className="mr-2 size-4 animate-spin" />}
							{cfg ? "Regenerate" : "Generate"}
						</Button>
					</div>

					<div className="space-y-3">
						<h3 className="text-sm font-semibold">Upload your own .p12</h3>
						<p className="text-muted-foreground text-xs">
							Bring an organizational or qualified certificate for full trust.
						</p>
						<div className="space-y-2">
							<Label htmlFor="p12">Certificate file (.p12 / .pfx)</Label>
							<Input
								accept=".p12,.pfx"
								data-testid="signing-p12-file"
								id="p12"
								ref={fileRef}
								type="file"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="p12pw">Password</Label>
							<Input
								id="p12pw"
								onChange={(e) => setP12Password(e.target.value)}
								type="password"
								value={p12Password}
							/>
						</div>
						<Button
							data-testid="upload-cert-button"
							disabled={busy}
							onClick={upload}
							size="sm"
							variant="outline"
						>
							<IconUpload className="mr-2 size-4" />
							Upload
						</Button>
					</div>
				</div>
			</div>

			<Dialog
				onOpenChange={(o) => {
					if (!busy && !o) setConfirm(null);
				}}
				open={confirm !== null}
			>
				<DialogContent data-testid="rotate-cert-dialog">
					<DialogHeader>
						<DialogTitle>Replace the signing certificate?</DialogTitle>
						<DialogDescription asChild>
							<div className="space-y-2">
								<p>
									This invalidates verification of every document signed with
									the current certificate — including copies participants have{" "}
									<strong className="text-foreground">
										already downloaded
									</strong>
									, which cannot be recalled.
								</p>
								<p>
									Documents still stored here will be{" "}
									<strong className="text-foreground">
										re-signed with the new certificate
									</strong>{" "}
									and the participants re-notified. Already-distributed copies
									stay unverifiable until you re-share the re-issued ones.
								</p>
							</div>
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							disabled={busy}
							onClick={() => setConfirm(null)}
							variant="outline"
						>
							Cancel
						</Button>
						<Button
							data-testid="rotate-cert-confirm"
							disabled={busy}
							onClick={() =>
								confirm === "generate" ? doGenerate() : doUpload()
							}
						>
							{busy && <IconLoader2 className="mr-2 size-4 animate-spin" />}
							Replace &amp; re-sign
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</SettingsSection>
	);
}

function AppearanceSection({
	cfg,
	onChanged,
}: {
	cfg: Omit<DocumentSigningSettings, "passwordSealed" | "p12Base64">;
	onChanged: () => Promise<void>;
}) {
	const [reason, setReason] = useState(cfg.sealReason);
	const [corner, setCorner] = useState(cfg.sealCorner);
	const [qr, setQr] = useState(cfg.sealQrEnabled);
	const [certifying, setCertifying] = useState(cfg.certifying);
	const [busy, setBusy] = useState(false);

	const save = async () => {
		setBusy(true);
		try {
			await setSigningAppearanceFn({
				data: {
					sealReason: reason,
					sealCorner: corner,
					sealQrEnabled: qr,
					certifying,
				},
			});
			await onChanged();
			toast.success("Appearance saved");
		} catch (e) {
			toast.error(getErrorMessage(e, "Failed to save"));
		}
		setBusy(false);
	};

	return (
		<SettingsSection
			description="How the visible signature stamp looks on the page"
			icon={IconCertificate}
			title="Seal appearance"
		>
			<div className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="reason">Reason / issuer text</Label>
					<Input
						id="reason"
						onChange={(e) => setReason(e.target.value)}
						placeholder="e.g. Issued by the conference"
						value={reason}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="corner">Stamp position</Label>
					<Select
						items={CORNERS.map((c) => ({
							value: c,
							label: c.replace("-", " "),
						}))}
						onValueChange={(v) =>
							// SAFETY: the select renders only the four corner values.
							setCorner(v as DocumentSigningSettings["sealCorner"])
						}
						value={corner}
					>
						<SelectTrigger className="max-w-[220px]" id="corner">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{CORNERS.map((c) => (
								<SelectItem key={c} value={c}>
									{c.replace("-", " ")}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="flex items-center gap-3 text-sm">
					<Switch checked={qr} id="seal-qr" onCheckedChange={setQr} />
					<Label className="font-normal" htmlFor="seal-qr">
						Embed a QR code linking to the verification page
					</Label>
				</div>
				<div className="flex items-center gap-3 text-sm">
					<Switch
						checked={certifying}
						id="seal-certify"
						onCheckedChange={setCertifying}
					/>
					<Label className="font-normal" htmlFor="seal-certify">
						Certifying signature (locks the PDF against further edits)
					</Label>
				</div>
				<div className="flex justify-end">
					<Button disabled={busy} onClick={save} size="sm">
						{busy && <IconLoader2 className="mr-2 size-4 animate-spin" />}
						Save
					</Button>
				</div>
			</div>
		</SettingsSection>
	);
}

function TimestampSection({
	cfg,
	onChanged,
}: {
	cfg: Omit<DocumentSigningSettings, "passwordSealed" | "p12Base64">;
	onChanged: () => Promise<void>;
}) {
	const [enabled, setEnabled] = useState(cfg.timestampEnabled);
	const [url, setUrl] = useState(cfg.timestampUrl || DEFAULT_TSA_URL);
	const [busy, setBusy] = useState(false);

	const save = async () => {
		setBusy(true);
		try {
			await setSigningTimestampFn({ data: { enabled, url } });
			await onChanged();
			toast.success("Timestamp settings saved");
		} catch (e) {
			toast.error(getErrorMessage(e, "Failed to save"));
		}
		setBusy(false);
	};

	return (
		<SettingsSection
			description="Optional. Proves when the document was signed and keeps the signature verifiable after the certificate expires"
			icon={IconShieldCheck}
			title="Trusted timestamp (RFC 3161)"
		>
			<div className="space-y-4">
				<div className="flex items-center gap-3 text-sm">
					<Switch
						checked={enabled}
						data-testid="timestamp-switch"
						id="ts-enabled"
						onCheckedChange={setEnabled}
					/>
					<Label className="font-normal" htmlFor="ts-enabled">
						Add a timestamp from a public time-stamping authority
					</Label>
				</div>
				<div className="space-y-2">
					<Label htmlFor="tsa">TSA URL</Label>
					<Input
						disabled={!enabled}
						id="tsa"
						onChange={(e) => setUrl(e.target.value)}
						value={url}
					/>
					<p className="text-muted-foreground text-xs">
						Free options: {DEFAULT_TSA_URL}, http://timestamp.digicert.com
					</p>
				</div>
				<div className="flex justify-end">
					<Button disabled={busy} onClick={save} size="sm">
						{busy && <IconLoader2 className="mr-2 size-4 animate-spin" />}
						Save
					</Button>
				</div>
			</div>
		</SettingsSection>
	);
}
