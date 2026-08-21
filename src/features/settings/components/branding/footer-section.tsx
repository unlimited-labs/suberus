import { IconPalette } from "@tabler/icons-react";
import type { BrandingSettings } from "@/features/settings/api/settings";
import { SettingsSaveButton } from "@/features/settings/components/settings-save-button";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import type { BrandingSettingsHandleChange } from "./use-branding-settings";

interface FooterSectionProps {
	data: BrandingSettings;
	onChange: BrandingSettingsHandleChange;
	onSave: () => void;
	isSaving: boolean;
}

export function FooterSection({
	data,
	onChange,
	onSave,
	isSaving,
}: FooterSectionProps) {
	return (
		<SettingsSection
			delay={200}
			description="Text displayed in the page footer"
			icon={IconPalette}
			title="Footer"
		>
			<div className="space-y-2">
				<Label htmlFor="footerText">Footer text</Label>
				<Textarea
					className="min-h-20"
					id="footerText"
					onChange={(e) => onChange("footerText", e.target.value)}
					placeholder="© 2026 Conference Name"
					value={data.footerText}
				/>
			</div>
			<SettingsSaveButton isSaving={isSaving} onSave={onSave} />
		</SettingsSection>
	);
}
