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
				onChange={handleChange}
				onSave={handleSave}
				isSaving={isSaving}
				logo={logo}
				favicon={favicon}
			/>

			<AuthBackgroundSection
				data={data}
				onChange={handleChange}
				onSave={handleSave}
				isSaving={isSaving}
				upload={bg}
			/>

			<ThemeColorsSection
				data={data}
				onChange={handleChange}
				onSave={handleSave}
				isSaving={isSaving}
			/>

			<FooterSection
				data={data}
				onChange={handleChange}
				onSave={handleSave}
				isSaving={isSaving}
			/>
		</div>
	);
}
