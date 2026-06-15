import { IconPhoto } from "@tabler/icons-react";
import type { BrandingSettings } from "@/features/settings/api/settings";
import { SettingsSaveButton } from "@/features/settings/components/settings-save-button";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { Checkbox } from "@/shared/ui/checkbox";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import type { BrandingSettingsHandleChange } from "./use-branding-settings";

interface LogoGraphicsSectionProps {
	data: BrandingSettings;
	onChange: BrandingSettingsHandleChange;
	onSave: () => void;
	isSaving: boolean;
}

export function LogoGraphicsSection({
	data,
	onChange,
	onSave,
	isSaving,
}: LogoGraphicsSectionProps) {
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
						placeholder="https://example.com/logo.png"
					/>
					{data.logoUrl && (
						<div className="mt-2 rounded-lg border border-border/50 bg-muted/30 p-4">
							<img
								src={data.logoUrl}
								alt="Logo preview"
								className="max-h-16 object-contain"
								onError={(e) => {
									e.currentTarget.style.display = "none";
								}}
							/>
						</div>
					)}
				</div>
				<div className="space-y-2">
					<Label htmlFor="faviconUrl">Favicon URL</Label>
					<Input
						id="faviconUrl"
						value={data.faviconUrl}
						onChange={(e) => onChange("faviconUrl", e.target.value)}
						placeholder="https://example.com/favicon.ico"
					/>
				</div>
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
