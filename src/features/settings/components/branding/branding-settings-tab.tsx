import type { BrandingSettings } from "@/features/settings/api/settings";
import { AuthBackgroundSection } from "./auth-background-section";
import { FooterSection } from "./footer-section";
import { LogoGraphicsSection } from "./logo-graphics-section";
import { ThemeColorsSection } from "./theme-colors-section";

interface BrandingSettingsTabProps {
	initialData: BrandingSettings;
}

export function BrandingSettingsTab({ initialData }: BrandingSettingsTabProps) {
	return (
		<div className="space-y-6">
			<LogoGraphicsSection initialData={initialData} />

			<AuthBackgroundSection initialData={initialData} />

			<ThemeColorsSection initialData={initialData} />

			<FooterSection initialData={initialData} />
		</div>
	);
}
