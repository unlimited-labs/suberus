import { IconPhoto } from "@tabler/icons-react";
import type { BrandingSettings } from "@/features/settings/api/settings";
import { SettingsSaveButton } from "@/features/settings/components/settings-save-button";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { Checkbox } from "@/shared/ui/checkbox";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { ImageUploadControl } from "./image-upload-control";
import {
	type BrandingSettingsHandleChange,
	type ImageUpload,
	MAX_BG_SIZE_MB,
} from "./use-branding-settings";

interface LogoGraphicsSectionProps {
	data: BrandingSettings;
	onChange: BrandingSettingsHandleChange;
	onSave: () => void;
	isSaving: boolean;
	logo: ImageUpload;
	favicon: ImageUpload;
}

export function LogoGraphicsSection({
	data,
	onChange,
	onSave,
	isSaving,
	logo,
	favicon,
}: LogoGraphicsSectionProps) {
	// Uploaded file takes precedence over the typed URL.
	const logoPreview = data.logoUploadUrl || data.logoUrl;
	const faviconPreview = data.faviconUploadUrl || data.faviconUrl;

	return (
		<SettingsSection
			description="Conference logo and favicon"
			icon={IconPhoto}
			title="Logo & Graphics"
		>
			<div className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="logoUrl">Logo URL</Label>
					<Input
						id="logoUrl"
						onChange={(e) => onChange("logoUrl", e.target.value)}
						placeholder="https://"
						value={data.logoUrl}
					/>
					{logoPreview && (
						<div
							className="mt-2 rounded-lg border border-border/50 bg-muted/30 p-4"
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
						hasImage={Boolean(data.logoUploadUrl)}
						testIdPrefix="logo"
						upload={logo}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="faviconUrl">Favicon URL</Label>
					<Input
						id="faviconUrl"
						onChange={(e) => onChange("faviconUrl", e.target.value)}
						placeholder="https://"
						value={data.faviconUrl}
					/>
					{faviconPreview && (
						<div
							className="mt-2 rounded-lg border border-border/50 bg-muted/30 p-4"
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
						hasImage={Boolean(data.faviconUploadUrl)}
						testIdPrefix="favicon"
						upload={favicon}
					/>
				</div>
				<p className="text-xs text-muted-foreground">
					Upload accepted formats: JPG, PNG, WebP. Max size: {MAX_BG_SIZE_MB}MB.
					An uploaded file takes precedence over the URL.
				</p>
				<div className="flex items-center gap-2">
					<Checkbox
						checked={data.logoDarkInvert}
						id="logoDarkInvert"
						onCheckedChange={(checked) =>
							onChange("logoDarkInvert", checked === true)
						}
					/>
					<Label className="cursor-pointer" htmlFor="logoDarkInvert">
						Invert logo in dark mode
					</Label>
				</div>
			</div>
			<SettingsSaveButton isSaving={isSaving} onSave={onSave} />
		</SettingsSection>
	);
}
