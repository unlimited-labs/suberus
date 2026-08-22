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
	const { form, images, bg, logo, favicon } = useBrandingSettings(initialData);

	return (
		<div className="space-y-6">
			<LogoGraphicsSection
				favicon={favicon}
				form={form}
				images={images}
				logo={logo}
			/>

			<AuthBackgroundSection form={form} images={images} upload={bg} />

			<ThemeColorsSection form={form} />

			<FooterSection form={form} />
		</div>
	);
}
