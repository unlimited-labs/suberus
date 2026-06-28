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

function CertificateSection({
	cfg,
	conferenceName,
	formatDate,
	onChanged,
}: {
	cfg: Omit<DocumentSigningSettings, "passwordSealed"> | null;
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

	const resignAfterRotation = async () => {
		try {
			const res = await fetch("/api/documents/resign", { method: "POST" });
			if (!res.ok) throw new Error(String(res.status));
			const { count } = (await res.json()) as { count: number };
			if (count > 0) {
				toast.success(
					`Re-signing ${count} previously signed document(s) with the new certificate`,
				);
			}
		} catch (e) {
			toast.error(
				getErrorMessage(
					e,
					"Certificate rotated, but re-signing failed to start",
				),
			);
		}
	};

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
		} finally {
			setBusy(false);
			setConfirm(null);
		}
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
		} finally {
			setBusy(false);
			setConfirm(null);
		}
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
		} finally {
			setBusy(false);
		}
	};

	return (
		<SettingsSection
			icon={IconShieldCheck}
			title="Digital signature"
			description="Cryptographically sign generated PDF documents with the conference's identity"
		>
			<div className="space-y-5" data-testid="document-signing-section">
				{cfg ? (
					<div
						className="rounded-xl border border-border/60 bg-muted/20 p-4"
						data-testid="signing-cert-status"
					>
						<div className="mb-3 flex items-center justify-between gap-3">
							<div className="flex items-center gap-2">
								<IconCertificate className="size-5 text-primary" />
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
									className="break-all font-mono text-xs"
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
							<Button asChild variant="outline" size="sm">
								<a href="/api/documents/signing-cert">
									<IconDownload className="mr-2 size-4" />
									Download public certificate
								</a>
							</Button>
							<div className="flex items-center gap-2 text-sm">
								<Switch
									id="signing-enabled"
									checked={cfg.enabled}
									disabled={busy}
									onCheckedChange={toggleEnabled}
									data-testid="signing-enabled-switch"
								/>
								<Label htmlFor="signing-enabled" className="font-normal">
									Sign new documents
								</Label>
							</div>
						</div>
						<p className="mt-3 text-xs text-muted-foreground">
							Self-signed signatures prove the document was issued here and was
							not altered. In a PDF reader the signer shows as "not trusted"
							until the verifier imports this certificate — or anyone can
							confirm authenticity on the public verification page.
						</p>
					</div>
				) : (
					<p className="text-sm text-muted-foreground">
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
								id="cn"
								value={commonName}
								onChange={(e) => setCommonName(e.target.value)}
								data-testid="signing-common-name"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="org">Organization</Label>
							<Input
								id="org"
								value={org}
								onChange={(e) => setOrg(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="validity">Validity (years)</Label>
							<Input
								id="validity"
								type="number"
								min={1}
								max={10}
								value={validYears}
								onChange={(e) => setValidYears(Number(e.target.value))}
								className="max-w-[140px]"
							/>
						</div>
						<Button
							onClick={generate}
							disabled={busy}
							size="sm"
							data-testid="generate-cert-button"
						>
							{busy && <IconLoader2 className="mr-2 size-4 animate-spin" />}
							{cfg ? "Regenerate" : "Generate"}
						</Button>
					</div>

					<div className="space-y-3">
						<h3 className="text-sm font-semibold">Upload your own .p12</h3>
						<p className="text-xs text-muted-foreground">
							Bring an organizational or qualified certificate for full trust.
						</p>
						<div className="space-y-2">
							<Label htmlFor="p12">Certificate file (.p12 / .pfx)</Label>
							<Input
								id="p12"
								type="file"
								accept=".p12,.pfx"
								ref={fileRef}
								data-testid="signing-p12-file"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="p12pw">Password</Label>
							<Input
								id="p12pw"
								type="password"
								value={p12Password}
								onChange={(e) => setP12Password(e.target.value)}
							/>
						</div>
						<Button
							onClick={upload}
							disabled={busy}
							size="sm"
							variant="outline"
							data-testid="upload-cert-button"
						>
							<IconUpload className="mr-2 size-4" />
							Upload
						</Button>
					</div>
				</div>
			</div>

			<Dialog
				open={confirm !== null}
				onOpenChange={(o) => {
					if (!busy && !o) setConfirm(null);
				}}
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
							variant="outline"
							onClick={() => setConfirm(null)}
							disabled={busy}
						>
							Cancel
						</Button>
						<Button
							onClick={() =>
								confirm === "generate" ? doGenerate() : doUpload()
							}
							disabled={busy}
							data-testid="rotate-cert-confirm"
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
	cfg: Omit<DocumentSigningSettings, "passwordSealed">;
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
		} finally {
			setBusy(false);
		}
	};

	return (
		<SettingsSection
			icon={IconCertificate}
			title="Seal appearance"
			description="How the visible signature stamp looks on the page"
		>
			<div className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="reason">Reason / issuer text</Label>
					<Input
						id="reason"
						value={reason}
						placeholder="e.g. Issued by the conference"
						onChange={(e) => setReason(e.target.value)}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="corner">Stamp position</Label>
					<Select
						value={corner}
						onValueChange={(v) =>
							setCorner(v as DocumentSigningSettings["sealCorner"])
						}
					>
						<SelectTrigger id="corner" className="max-w-[220px]">
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
					<Switch id="seal-qr" checked={qr} onCheckedChange={setQr} />
					<Label htmlFor="seal-qr" className="font-normal">
						Embed a QR code linking to the verification page
					</Label>
				</div>
				<div className="flex items-center gap-3 text-sm">
					<Switch
						id="seal-certify"
						checked={certifying}
						onCheckedChange={setCertifying}
					/>
					<Label htmlFor="seal-certify" className="font-normal">
						Certifying signature (locks the PDF against further edits)
					</Label>
				</div>
				<div className="flex justify-end">
					<Button onClick={save} disabled={busy} size="sm">
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
	cfg: Omit<DocumentSigningSettings, "passwordSealed">;
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
		} finally {
			setBusy(false);
		}
	};

	return (
		<SettingsSection
			icon={IconShieldCheck}
			title="Trusted timestamp (RFC 3161)"
			description="Optional. Proves when the document was signed and keeps the signature verifiable after the certificate expires"
		>
			<div className="space-y-4">
				<div className="flex items-center gap-3 text-sm">
					<Switch
						id="ts-enabled"
						checked={enabled}
						onCheckedChange={setEnabled}
						data-testid="timestamp-switch"
					/>
					<Label htmlFor="ts-enabled" className="font-normal">
						Add a timestamp from a public time-stamping authority
					</Label>
				</div>
				<div className="space-y-2">
					<Label htmlFor="tsa">TSA URL</Label>
					<Input
						id="tsa"
						value={url}
						disabled={!enabled}
						onChange={(e) => setUrl(e.target.value)}
					/>
					<p className="text-xs text-muted-foreground">
						Free options: {DEFAULT_TSA_URL}, http://timestamp.digicert.com
					</p>
				</div>
				<div className="flex justify-end">
					<Button onClick={save} disabled={busy} size="sm">
						{busy && <IconLoader2 className="mr-2 size-4 animate-spin" />}
						Save
					</Button>
				</div>
			</div>
		</SettingsSection>
	);
}
