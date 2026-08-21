import type { BrandingSettings } from "@/features/settings/api/settings";
import { AuthBackgroundSection } from "./auth-background-section";
import { FooterSection } from "./footer-section";
import { LogoGraphicsSection } from "./logo-graphics-section";
import { ThemeColorsSection } from "./theme-colors-section";
import { useBrandingSettings } from "./use-branding-settings";

interface BrandingSettingsTabProps {
	initialData: BrandingSettings;
}

export function BrandingSettingsTab({ initialData }: BrandingSettingsTabProps) {
	const { data, isSaving, handleChange, handleSave, bg, logo, favicon } =
		useBrandingSettings(initialData);

	return (
		<div className="space-y-6">
			<LogoGraphicsSection
				data={data}
				favicon={favicon}
				isSaving={isSaving}
				logo={logo}
				onChange={handleChange}
				onSave={handleSave}
			/>

			<AuthBackgroundSection
				data={data}
				isSaving={isSaving}
				onChange={handleChange}
				onSave={handleSave}
				upload={bg}
			/>

			<ThemeColorsSection
				data={data}
				isSaving={isSaving}
				onChange={handleChange}
				onSave={handleSave}
			/>

			<FooterSection
				data={data}
				isSaving={isSaving}
				onChange={handleChange}
				onSave={handleSave}
			/>
		</div>
	);
}
