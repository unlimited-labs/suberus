import { IconPhoto } from "@tabler/icons-react";
import { useSelector } from "@tanstack/react-store";
import type { BrandingSettings } from "@/features/settings/api/settings";
import { SettingsSaveButton } from "@/features/settings/components/settings-save-button";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { Form } from "@/shared/components/composable/form";
import { isFieldErrorVisible } from "@/shared/hooks/use-field-error";
import { Checkbox } from "@/shared/ui/checkbox";
import { FieldError } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { ImageUploadControl } from "./image-upload-control";
import {
	type LogoGraphicsFormApi,
	MAX_BG_SIZE_MB,
	useLogoGraphicsSection,
} from "./use-branding-settings";

interface LogoGraphicsSectionProps {
	initialData: BrandingSettings;
}

interface UrlFieldProps {
	form: LogoGraphicsFormApi;
	name: "logoUrl" | "faviconUrl";
	label: string;
	submissionAttempts: number;
}

function UrlField({ form, name, label, submissionAttempts }: UrlFieldProps) {
	return (
		<form.Field name={name}>
			{(field) => {
				const hasError = isFieldErrorVisible(
					field.state.meta,
					submissionAttempts,
				);
				return (
					<>
						<Label htmlFor={name}>{label}</Label>
						<Input
							aria-invalid={hasError}
							id={name}
							onBlur={field.handleBlur}
							onChange={(e) => field.handleChange(e.target.value)}
							placeholder="https://"
							value={field.state.value}
						/>
						<FieldError
							errors={hasError ? field.state.meta.errors : undefined}
						/>
					</>
				);
			}}
		</form.Field>
	);
}

export function LogoGraphicsSection({ initialData }: LogoGraphicsSectionProps) {
	const { form, logoUploadUrl, faviconUploadUrl, logo, favicon } =
		useLogoGraphicsSection(initialData);
	const submissionAttempts = useSelector(
		form.store,
		(s) => s.submissionAttempts,
	);
	const isSubmitting = useSelector(form.store, (s) => s.isSubmitting);
	const values = useSelector(form.store, (s) => s.values);

	const logoPreview = logoUploadUrl || values.logoUrl;
	const faviconPreview = faviconUploadUrl || values.faviconUrl;

	return (
		<SettingsSection
			description="Conference logo and favicon"
			icon={IconPhoto}
			title="Logo & Graphics"
		>
			<Form onSubmit={() => void form.handleSubmit()}>
				<div className="space-y-4">
					<div className="space-y-2">
						<UrlField
							form={form}
							label="Logo URL"
							name="logoUrl"
							submissionAttempts={submissionAttempts}
						/>
						{logoPreview && (
							<div
								className="border-border/50 bg-muted/30 mt-2 rounded-lg border p-4"
								data-testid="logo-preview"
							>
								<img
									alt="Logo preview"
									className="max-h-16 object-contain"
									onError={(e) => {
										e.currentTarget.style.display = "none";
									}}
									src={logoPreview}
								/>
							</div>
						)}
						<ImageUploadControl
							ariaLabel="Upload logo"
							hasImage={Boolean(logoUploadUrl)}
							testIdPrefix="logo"
							upload={logo}
						/>
					</div>
					<div className="space-y-2">
						<UrlField
							form={form}
							label="Favicon URL"
							name="faviconUrl"
							submissionAttempts={submissionAttempts}
						/>
						{faviconPreview && (
							<div
								className="border-border/50 bg-muted/30 mt-2 rounded-lg border p-4"
								data-testid="favicon-preview"
							>
								<img
									alt="Favicon preview"
									className="max-h-12 object-contain"
									onError={(e) => {
										e.currentTarget.style.display = "none";
									}}
									src={faviconPreview}
								/>
							</div>
						)}
						<ImageUploadControl
							ariaLabel="Upload favicon"
							hasImage={Boolean(faviconUploadUrl)}
							testIdPrefix="favicon"
							upload={favicon}
						/>
					</div>
					<p className="text-muted-foreground text-xs">
						Upload accepted formats: JPG, PNG, WebP. Max size: {MAX_BG_SIZE_MB}
						MB. An uploaded file takes precedence over the URL.
					</p>
					<div className="flex items-center gap-2">
						<form.Field name="logoDarkInvert">
							{(field) => (
								<Checkbox
									checked={field.state.value}
									id="logoDarkInvert"
									onCheckedChange={(checked) =>
										field.handleChange(checked === true)
									}
								/>
							)}
						</form.Field>
						<Label className="cursor-pointer" htmlFor="logoDarkInvert">
							Invert logo in dark mode
						</Label>
					</div>
				</div>
				<SettingsSaveButton
					isSaving={isSubmitting}
					testId="save-logo-graphics"
				/>
			</Form>
		</SettingsSection>
	);
}
