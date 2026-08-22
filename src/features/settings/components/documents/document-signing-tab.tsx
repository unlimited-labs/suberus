import {
	IconAlertTriangle,
	IconCertificate,
	IconDownload,
	IconLoader2,
	IconShieldCheck,
	IconUpload,
} from "@tabler/icons-react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useSelector } from "@tanstack/react-store";
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
import type {
	DocumentSigningSettings,
	SafeSigningConfig,
} from "@/features/settings/types";
import {
	type SigningCertFormValues,
	signingAppearanceSchema,
	signingCertFormSchema,
	signingCertUploadFormSchema,
	signingTimestampSchema,
} from "@/features/settings/validations";
import { useAppForm } from "@/shared/hooks/use-app-form";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { isFieldErrorVisible } from "@/shared/hooks/use-field-error";
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
import { FieldError } from "@/shared/ui/field";
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
	cfg: SafeSigningConfig | null;
	conferenceName: string;
	formatDate: (d: Date) => string;
	onChanged: () => Promise<void>;
}) {
	const certForm = useAppForm({
		defaultValues: {
			commonName: conferenceName,
			org: conferenceName,
			validYears: "5",
		} satisfies SigningCertFormValues,
		validators: {
			onChange: signingCertFormSchema,
			onSubmit: signingCertFormSchema,
		},
		onSubmit: async ({ value }) => {
			const parsed = signingCertFormSchema.parse(value);
			const wasRotation = Boolean(cfg);
			try {
				await generateSigningCertFn({
					data: {
						commonName: parsed.commonName,
						org: parsed.org,
						validDays: parsed.validYears * 365,
					},
				});
				await onChanged();
				toast.success("Certificate generated");
				if (wasRotation) await resignAfterRotation();
			} catch (e) {
				toast.error(getErrorMessage(e, "Failed to generate certificate"));
			}
			setConfirm(null);
		},
	});

	const uploadForm = useAppForm({
		// SAFETY: widening the empty initial value, so picking a file typechecks.
		defaultValues: { file: null as File | null, password: "" },
		validators: {
			onChange: signingCertUploadFormSchema,
			onSubmit: signingCertUploadFormSchema,
		},
		onSubmit: async ({ value }) => {
			if (!value.file) return;
			const wasRotation = Boolean(cfg);
			try {
				const body = new FormData();
				body.append("p12", value.file);
				body.append("password", value.password);
				await uploadSigningCertFn({ data: body });
				await onChanged();
				toast.success("Certificate uploaded");
				uploadForm.reset();
				if (fileRef.current) fileRef.current.value = "";
				if (wasRotation) await resignAfterRotation();
			} catch (e) {
				toast.error(getErrorMessage(e, "Failed to upload certificate"));
			}
			setConfirm(null);
		},
	});

	const [busy, setBusy] = useState(false);
	const fileRef = useRef<HTMLInputElement>(null);
	const [confirm, setConfirm] = useState<null | "generate" | "upload">(null);

	const certAttempts = useSelector(certForm.store, (s) => s.submissionAttempts);
	const uploadAttempts = useSelector(
		uploadForm.store,
		(s) => s.submissionAttempts,
	);
	const certSubmitting = useSelector(certForm.store, (s) => s.isSubmitting);
	const uploadSubmitting = useSelector(uploadForm.store, (s) => s.isSubmitting);
	const working = busy || certSubmitting || uploadSubmitting;

	const expiresInDays = cfg ? daysUntil(cfg.validUntil) : null;

	const submitOrConfirm = async (
		form: typeof certForm | typeof uploadForm,
		kind: "generate" | "upload",
	) => {
		const errors = await form.validateAllFields("submit");
		if (errors.flat().length > 0 || !cfg) {
			void form.handleSubmit();
			return;
		}
		setConfirm(kind);
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
						{cfg.enabled && !cfg.hasP12 && (
							<p
								className="mt-3 flex items-center gap-2 text-sm text-red-600 dark:text-red-400"
								data-testid="signing-missing-material-warning"
							>
								<IconAlertTriangle className="size-4 shrink-0" />
								Signing is on but no certificate is stored — document generation
								will fail until you upload or regenerate one.
							</p>
						)}
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
									disabled={working}
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
						<certForm.Field name="commonName">
							{(field) => {
								const hasError = isFieldErrorVisible(
									field.state.meta,
									certAttempts,
								);
								return (
									<div className="space-y-2">
										<Label htmlFor="commonName">Common name</Label>
										<Input
											aria-invalid={hasError}
											data-testid="signing-common-name"
											id="commonName"
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											value={field.state.value}
										/>
										<FieldError
											errors={hasError ? field.state.meta.errors : undefined}
										/>
									</div>
								);
							}}
						</certForm.Field>
						<certForm.Field name="org">
							{(field) => {
								const hasError = isFieldErrorVisible(
									field.state.meta,
									certAttempts,
								);
								return (
									<div className="space-y-2">
										<Label htmlFor="org">Organization</Label>
										<Input
											aria-invalid={hasError}
											id="org"
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											value={field.state.value}
										/>
										<FieldError
											errors={hasError ? field.state.meta.errors : undefined}
										/>
									</div>
								);
							}}
						</certForm.Field>
						<certForm.Field name="validYears">
							{(field) => {
								const hasError = isFieldErrorVisible(
									field.state.meta,
									certAttempts,
								);
								return (
									<div className="space-y-2">
										<Label htmlFor="validYears">Validity (years)</Label>
										<Input
											aria-invalid={hasError}
											className="max-w-[140px]"
											id="validYears"
											max={10}
											min={1}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											type="number"
											value={field.state.value}
										/>
										<FieldError
											errors={hasError ? field.state.meta.errors : undefined}
										/>
									</div>
								);
							}}
						</certForm.Field>
						<Button
							data-testid="generate-cert-button"
							disabled={working}
							onClick={() => void submitOrConfirm(certForm, "generate")}
							size="sm"
						>
							{working && <IconLoader2 className="mr-2 size-4 animate-spin" />}
							{cfg ? "Regenerate" : "Generate"}
						</Button>
					</div>

					<div className="space-y-3">
						<h3 className="text-sm font-semibold">Upload your own .p12</h3>
						<p className="text-muted-foreground text-xs">
							Bring an organizational or qualified certificate for full trust.
						</p>
						<uploadForm.Field name="file">
							{(field) => {
								const hasError = isFieldErrorVisible(
									field.state.meta,
									uploadAttempts,
								);
								return (
									<div className="space-y-2">
										<Label htmlFor="p12">Certificate file (.p12 / .pfx)</Label>
										<Input
											accept=".p12,.pfx"
											aria-invalid={hasError}
											data-testid="signing-p12-file"
											id="p12"
											onChange={(e) =>
												field.handleChange(e.target.files?.[0] ?? null)
											}
											ref={fileRef}
											type="file"
										/>
										<FieldError
											errors={hasError ? field.state.meta.errors : undefined}
										/>
									</div>
								);
							}}
						</uploadForm.Field>
						<uploadForm.Field name="password">
							{(field) => {
								const hasError = isFieldErrorVisible(
									field.state.meta,
									uploadAttempts,
								);
								return (
									<div className="space-y-2">
										<Label htmlFor="p12pw">Password</Label>
										<Input
											aria-invalid={hasError}
											id="p12pw"
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											type="password"
											value={field.state.value}
										/>
										<FieldError
											errors={hasError ? field.state.meta.errors : undefined}
										/>
									</div>
								);
							}}
						</uploadForm.Field>
						<Button
							data-testid="upload-cert-button"
							disabled={working}
							onClick={() => void submitOrConfirm(uploadForm, "upload")}
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
					if (!working && !o) setConfirm(null);
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
							disabled={working}
							onClick={() => setConfirm(null)}
							variant="outline"
						>
							Cancel
						</Button>
						<Button
							data-testid="rotate-cert-confirm"
							disabled={working}
							onClick={() =>
								void (confirm === "generate"
									? certForm.handleSubmit()
									: uploadForm.handleSubmit())
							}
						>
							{working && <IconLoader2 className="mr-2 size-4 animate-spin" />}
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
	cfg: SafeSigningConfig;
	onChanged: () => Promise<void>;
}) {
	const form = useAppForm({
		defaultValues: {
			sealReason: cfg.sealReason,
			sealCorner: cfg.sealCorner,
			sealQrEnabled: cfg.sealQrEnabled,
			certifying: cfg.certifying,
		},
		validators: {
			onChange: signingAppearanceSchema,
			onSubmit: signingAppearanceSchema,
		},
		onSubmit: async ({ value }) => {
			try {
				await setSigningAppearanceFn({ data: value });
				await onChanged();
				toast.success("Appearance saved");
			} catch (e) {
				toast.error(getErrorMessage(e, "Failed to save"));
			}
		},
	});
	const submissionAttempts = useSelector(
		form.store,
		(s) => s.submissionAttempts,
	);

	return (
		<SettingsSection
			description="How the visible signature stamp looks on the page"
			icon={IconCertificate}
			title="Seal appearance"
		>
			<div className="space-y-4">
				<form.Field name="sealReason">
					{(field) => {
						const hasError = isFieldErrorVisible(
							field.state.meta,
							submissionAttempts,
						);
						return (
							<div className="space-y-2">
								<Label htmlFor="reason">Reason / issuer text</Label>
								<Input
									aria-invalid={hasError}
									id="reason"
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="e.g. Issued by the conference"
									value={field.state.value}
								/>
								<FieldError
									errors={hasError ? field.state.meta.errors : undefined}
								/>
							</div>
						);
					}}
				</form.Field>
				<form.Field name="sealCorner">
					{(field) => (
						<div className="space-y-2">
							<Label htmlFor="corner">Stamp position</Label>
							<Select
								items={CORNERS.map((c) => ({
									value: c,
									label: c.replace("-", " "),
								}))}
								onValueChange={(v) =>
									// SAFETY: the select renders only the four corner values.
									field.handleChange(v as DocumentSigningSettings["sealCorner"])
								}
								value={field.state.value}
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
					)}
				</form.Field>
				<div className="flex items-center gap-3 text-sm">
					<form.Field name="sealQrEnabled">
						{(field) => (
							<Switch
								checked={field.state.value}
								id="seal-qr"
								onCheckedChange={(v) => field.handleChange(v === true)}
							/>
						)}
					</form.Field>
					<Label className="font-normal" htmlFor="seal-qr">
						Embed a QR code linking to the verification page
					</Label>
				</div>
				<div className="flex items-center gap-3 text-sm">
					<form.Field name="certifying">
						{(field) => (
							<Switch
								checked={field.state.value}
								id="seal-certify"
								onCheckedChange={(v) => field.handleChange(v === true)}
							/>
						)}
					</form.Field>
					<Label className="font-normal" htmlFor="seal-certify">
						Certifying signature (locks the PDF against further edits)
					</Label>
				</div>
				<div className="flex justify-end">
					<form.Subscribe selector={(st) => st.isSubmitting}>
						{(isSubmitting) => (
							<Button
								disabled={isSubmitting}
								onClick={() => void form.handleSubmit()}
								size="sm"
							>
								{isSubmitting && (
									<IconLoader2 className="mr-2 size-4 animate-spin" />
								)}
								Save
							</Button>
						)}
					</form.Subscribe>
				</div>
			</div>
		</SettingsSection>
	);
}

function TimestampSection({
	cfg,
	onChanged,
}: {
	cfg: SafeSigningConfig;
	onChanged: () => Promise<void>;
}) {
	const form = useAppForm({
		defaultValues: {
			enabled: cfg.timestampEnabled,
			url: cfg.timestampUrl || DEFAULT_TSA_URL,
		},
		validators: {
			onChange: signingTimestampSchema,
			onSubmit: signingTimestampSchema,
		},
		onSubmit: async ({ value }) => {
			try {
				await setSigningTimestampFn({ data: value });
				await onChanged();
				toast.success("Timestamp settings saved");
			} catch (e) {
				toast.error(getErrorMessage(e, "Failed to save"));
			}
		},
	});
	const submissionAttempts = useSelector(
		form.store,
		(s) => s.submissionAttempts,
	);

	return (
		<SettingsSection
			description="Optional. Proves when the document was signed and keeps the signature verifiable after the certificate expires"
			icon={IconShieldCheck}
			title="Trusted timestamp (RFC 3161)"
		>
			<div className="space-y-4">
				<div className="flex items-center gap-3 text-sm">
					<form.Field name="enabled">
						{(field) => (
							<Switch
								checked={field.state.value}
								data-testid="timestamp-switch"
								id="ts-enabled"
								onCheckedChange={(v) => field.handleChange(v === true)}
							/>
						)}
					</form.Field>
					<Label className="font-normal" htmlFor="ts-enabled">
						Add a timestamp from a public time-stamping authority
					</Label>
				</div>
				<form.Subscribe selector={(st) => st.values.enabled}>
					{(enabled) => (
						<form.Field name="url">
							{(field) => {
								const hasError = isFieldErrorVisible(
									field.state.meta,
									submissionAttempts,
								);
								return (
									<div className="space-y-2">
										<Label htmlFor="tsa">TSA URL</Label>
										<Input
											aria-invalid={hasError}
											disabled={!enabled}
											id="tsa"
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											value={field.state.value}
										/>
										<FieldError
											errors={hasError ? field.state.meta.errors : undefined}
										/>
										<p className="text-muted-foreground text-xs">
											Free options: {DEFAULT_TSA_URL},
											http://timestamp.digicert.com
										</p>
									</div>
								);
							}}
						</form.Field>
					)}
				</form.Subscribe>
				<div className="flex justify-end">
					<form.Subscribe selector={(st) => st.isSubmitting}>
						{(isSubmitting) => (
							<Button
								disabled={isSubmitting}
								onClick={() => void form.handleSubmit()}
								size="sm"
							>
								{isSubmitting && (
									<IconLoader2 className="mr-2 size-4 animate-spin" />
								)}
								Save
							</Button>
						)}
					</form.Subscribe>
				</div>
			</div>
		</SettingsSection>
	);
}
