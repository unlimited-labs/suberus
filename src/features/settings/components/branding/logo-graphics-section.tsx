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
			icon={IconPhoto}
			title="Logo & Graphics"
			description="Conference logo and favicon"
		>
			<div className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="logoUrl">Logo URL</Label>
					<Input
						id="logoUrl"
						value={data.logoUrl}
						onChange={(e) => onChange("logoUrl", e.target.value)}
						placeholder="https://"
					/>
					{logoPreview && (
						<div
							className="mt-2 rounded-lg border border-border/50 bg-muted/30 p-4"
							data-testid="logo-preview"
						>
							<img
								src={logoPreview}
								alt="Logo preview"
								className="max-h-16 object-contain"
								onError={(e) => {
									e.currentTarget.style.display = "none";
								}}
							/>
						</div>
					)}
					<ImageUploadControl
						upload={logo}
						hasImage={Boolean(data.logoUploadUrl)}
						testIdPrefix="logo"
						ariaLabel="Upload logo"
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="faviconUrl">Favicon URL</Label>
					<Input
						id="faviconUrl"
						value={data.faviconUrl}
						onChange={(e) => onChange("faviconUrl", e.target.value)}
						placeholder="https://"
					/>
					{faviconPreview && (
						<div
							className="mt-2 rounded-lg border border-border/50 bg-muted/30 p-4"
							data-testid="favicon-preview"
						>
							<img
								src={faviconPreview}
								alt="Favicon preview"
								className="max-h-12 object-contain"
								onError={(e) => {
									e.currentTarget.style.display = "none";
								}}
							/>
						</div>
					)}
					<ImageUploadControl
						upload={favicon}
						hasImage={Boolean(data.faviconUploadUrl)}
						testIdPrefix="favicon"
						ariaLabel="Upload favicon"
					/>
				</div>
				<p className="text-xs text-muted-foreground">
					Upload accepted formats: JPG, PNG, WebP. Max size: {MAX_BG_SIZE_MB}MB.
					An uploaded file takes precedence over the URL.
				</p>
				<div className="flex items-center gap-2">
					<Checkbox
						id="logoDarkInvert"
						checked={data.logoDarkInvert}
						onCheckedChange={(checked) =>
							onChange("logoDarkInvert", checked === true)
						}
					/>
					<Label htmlFor="logoDarkInvert" className="cursor-pointer">
						Invert logo in dark mode
					</Label>
				</div>
			</div>
			<SettingsSaveButton onSave={onSave} isSaving={isSaving} />
		</SettingsSection>
	);
}
