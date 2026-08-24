import { IconPhotoUp } from "@tabler/icons-react";
import { useSelector } from "@tanstack/react-store";
import type { BrandingSettings } from "@/features/settings/api/settings";
import { SettingsSaveButton } from "@/features/settings/components/settings-save-button";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { Form } from "@/shared/components/composable/form";
import { Label } from "@/shared/ui/label";
import { Slider } from "@/shared/ui/slider";
import { ImageUploadControl } from "./image-upload-control";
import {
	MAX_BG_SIZE_MB,
	useAuthBackgroundSection,
} from "./use-branding-settings";

interface AuthBackgroundSectionProps {
	initialData: BrandingSettings;
}

export function AuthBackgroundSection({
	initialData,
}: AuthBackgroundSectionProps) {
	const { form, authBackgroundUrl, upload } =
		useAuthBackgroundSection(initialData);
	const isSubmitting = useSelector(form.store, (s) => s.isSubmitting);
	const hasImage = Boolean(authBackgroundUrl);

	return (
		<SettingsSection
			delay={50}
			description="Background image for login and registration pages"
			icon={IconPhotoUp}
			title="Auth Background Image"
		>
			<Form onSubmit={() => void form.handleSubmit()}>
				<div className="space-y-4">
					{hasImage && (
						<div
							className="border-border/50 overflow-hidden rounded-lg border"
							data-testid="auth-background-preview"
						>
							<img
								alt="Auth background preview"
								className="h-40 w-full object-cover"
								src={authBackgroundUrl}
							/>
						</div>
					)}

					<ImageUploadControl
						ariaLabel="Upload auth background"
						hasImage={hasImage}
						testIdPrefix="auth-background"
						upload={upload}
					/>

					{hasImage && (
						<form.Field name="authBgOverlay">
							{(field) => (
								<div className="space-y-2">
									<Label>Overlay darkness: {field.state.value}%</Label>
									<Slider
										max={100}
										min={0}
										onValueChange={(v) =>
											field.handleChange(Array.isArray(v) ? v[0] : v)
										}
										step={5}
										value={[field.state.value]}
									/>
									<p className="text-muted-foreground text-xs">
										Controls how dark the overlay is on the auth background
										image
									</p>
								</div>
							)}
						</form.Field>
					)}

					<p className="text-muted-foreground text-xs">
						Accepted formats: JPG, PNG, WebP. Max size: {MAX_BG_SIZE_MB}MB.
					</p>
				</div>
				{hasImage && (
					<SettingsSaveButton
						isSaving={isSubmitting}
						testId="save-auth-background"
					/>
				)}
			</Form>
		</SettingsSection>
	);
}
