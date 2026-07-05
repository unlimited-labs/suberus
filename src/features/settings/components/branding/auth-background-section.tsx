import { IconPhotoUp } from "@tabler/icons-react";
import type { BrandingSettings } from "@/features/settings/api/settings";
import { SettingsSaveButton } from "@/features/settings/components/settings-save-button";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { Label } from "@/shared/ui/label";
import { Slider } from "@/shared/ui/slider";
import { ImageUploadControl } from "./image-upload-control";
import {
	type BrandingSettingsHandleChange,
	type ImageUpload,
	MAX_BG_SIZE_MB,
} from "./use-branding-settings";

interface AuthBackgroundSectionProps {
	data: BrandingSettings;
	onChange: BrandingSettingsHandleChange;
	onSave: () => void;
	isSaving: boolean;
	upload: ImageUpload;
}

export function AuthBackgroundSection({
	data,
	onChange,
	onSave,
	isSaving,
	upload,
}: AuthBackgroundSectionProps) {
	const hasImage = Boolean(data.authBackgroundUrl);

	return (
		<SettingsSection
			icon={IconPhotoUp}
			title="Auth Background Image"
			description="Background image for login and registration pages"
			delay={50}
		>
			<div className="space-y-4">
				{hasImage && (
					<div
						className="overflow-hidden rounded-lg border border-border/50"
						data-testid="auth-background-preview"
					>
						<img
							src={data.authBackgroundUrl}
							alt="Auth background preview"
							className="h-40 w-full object-cover"
						/>
					</div>
				)}

				<ImageUploadControl
					upload={upload}
					hasImage={hasImage}
					testIdPrefix="auth-background"
					ariaLabel="Upload auth background"
				/>

				{hasImage && (
					<div className="space-y-2">
						<Label>Overlay darkness: {data.authBgOverlay}%</Label>
						<Slider
							value={[data.authBgOverlay]}
							onValueChange={(v) =>
								onChange("authBgOverlay", Array.isArray(v) ? v[0] : v)
							}
							min={0}
							max={100}
							step={5}
						/>
						<p className="text-xs text-muted-foreground">
							Controls how dark the overlay is on the auth background image
						</p>
					</div>
				)}

				<p className="text-xs text-muted-foreground">
					Accepted formats: JPG, PNG, WebP. Max size: {MAX_BG_SIZE_MB}MB.
				</p>
			</div>
			{hasImage && <SettingsSaveButton onSave={onSave} isSaving={isSaving} />}
		</SettingsSection>
	);
}
