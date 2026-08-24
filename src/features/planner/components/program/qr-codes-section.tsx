import { IconExternalLink, IconQrcode } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { adminSettingQueryOptions } from "@/features/settings/api/settings";
import { SettingsSection } from "@/features/settings/components/settings-section";
import type { ProgramQrSettings } from "@/features/settings/types";
import { Form } from "@/shared/components/composable/form";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { useQrSettingsForm } from "./hooks/use-qr-settings-form";

const ERROR_CORRECTION_OPTIONS = [
	{ value: "L", label: "L - 7% recovery" },
	{ value: "M", label: "M - 15% recovery" },
	{ value: "Q", label: "Q - 25% recovery" },
	{ value: "H", label: "H - 30% recovery" },
] as const;

const FORMAT_OPTIONS = [
	{ value: "svg", label: "SVG" },
	{ value: "png", label: "PNG" },
] as const;

function QrCodesForm({ settings }: { settings: ProgramQrSettings }) {
	const { form, submitFor } = useQrSettingsForm(settings);

	return (
		<Form
			onSubmit={() => {
				submitFor("zip");
			}}
		>
			<div className="grid gap-6 sm:grid-cols-2">
				<div className="space-y-2">
					<form.AppField name="format">
						{(field) => (
							<field.SelectField label="File format" options={FORMAT_OPTIONS} />
						)}
					</form.AppField>
					<p className="text-muted-foreground text-xs">
						SVG scales losslessly for print; PNG for tools that need a bitmap.
					</p>
				</div>
				<div className="space-y-2">
					<form.AppField name="errorCorrectionLevel">
						{(field) => (
							<field.SelectField
								label="Error correction"
								options={ERROR_CORRECTION_OPTIONS}
							/>
						)}
					</form.AppField>
					<p className="text-muted-foreground text-xs">
						Higher levels survive more damage but pack denser.
					</p>
				</div>
				<div className="space-y-2">
					<Label htmlFor="qr-width">Size</Label>
					<div className="flex items-center gap-2">
						<form.Field name="width">
							{(field) => (
								<Input
									className="w-28"
									id="qr-width"
									max={2048}
									min={128}
									onChange={(e) =>
										field.handleChange(Number(e.target.value) || 512)
									}
									step={64}
									type="number"
									value={field.state.value}
								/>
							)}
						</form.Field>
						<span className="text-muted-foreground text-sm">px</span>
					</div>
				</div>
				<div className="space-y-2">
					<Label htmlFor="qr-margin">Quiet zone</Label>
					<div className="flex items-center gap-2">
						<form.Field name="margin">
							{(field) => (
								<Input
									className="w-28"
									id="qr-margin"
									max={16}
									min={0}
									onChange={(e) =>
										field.handleChange(Number(e.target.value) || 0)
									}
									type="number"
									value={field.state.value}
								/>
							)}
						</form.Field>
						<span className="text-muted-foreground text-sm">modules</span>
					</div>
				</div>
			</div>

			<div className="mt-6 space-y-2">
				<form.AppField name="baseUrl">
					{(field) => (
						<field.InputField label="Substitute domain" testId="qr-base-url" />
					)}
				</form.AppField>
				<div className="text-muted-foreground space-y-1 text-xs">
					<p>
						Leave empty to use this site address.{" "}
						<a
							className="text-primary inline-flex items-center gap-1 underline underline-offset-4"
							href="https://docs.suberus.app/planner/publishing/#forwarding-a-substitute-domain"
							rel="noopener noreferrer"
							target="_blank"
						>
							Read docs how to configure your web server
							<IconExternalLink className="size-3" />
						</a>
					</p>
				</div>
			</div>

			<div className="mt-6 border-t pt-6">
				<form.AppField name="includeWithoutCameraReady">
					{(field) => (
						<field.SwitchField
							label="Include talks without a camera-ready PDF (the QR starts working once it is uploaded)"
							testId="qr-include-missing"
						/>
					)}
				</form.AppField>
			</div>

			<div className="mt-6 flex flex-wrap justify-end gap-2">
				<Button
					data-testid="qr-generate-program"
					onClick={() => submitFor("program")}
					type="button"
					variant="outline"
				>
					Program page QR
				</Button>
				<form.AppForm>
					<form.SubmitButton
						label="Generate ZIP"
						submittingLabel="Generating..."
						testId="qr-generate-zip"
					/>
				</form.AppForm>
			</div>
		</Form>
	);
}

export function QrCodesSection() {
	const { data: settings } = useQuery(adminSettingQueryOptions("PROGRAM_QR"));

	return (
		<SettingsSection
			description="Printable QR codes linking to camera-ready PDFs (/s/<number>) and to the public program page. Settings are saved when you generate."
			icon={IconQrcode}
			title="QR Codes"
		>
			{settings ? <QrCodesForm settings={settings} /> : null}
		</SettingsSection>
	);
}
