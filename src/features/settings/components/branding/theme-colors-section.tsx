import { IconLoader2, IconPalette, IconRestore } from "@tabler/icons-react";
import type { BrandingSettings } from "@/features/settings/api/settings";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { APP_SETTINGS_DEFAULTS } from "@/features/settings/defaults";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import type { BrandingSettingsHandleChange } from "./use-branding-settings";

interface ThemeColorsSectionProps {
	data: BrandingSettings;
	onChange: BrandingSettingsHandleChange;
	onSave: () => void;
	isSaving: boolean;
}

export function ThemeColorsSection({
	data,
	onChange,
	onSave,
	isSaving,
}: ThemeColorsSectionProps) {
	const handleReset = () => {
		onChange("primaryColor", APP_SETTINGS_DEFAULTS.BRANDING_PRIMARY_COLOR);
		onChange("secondaryColor", APP_SETTINGS_DEFAULTS.BRANDING_SECONDARY_COLOR);
	};

	return (
		<SettingsSection
			icon={IconPalette}
			title="Theme Colors"
			description="Customize interface colors"
			delay={100}
		>
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-2">
					<Label htmlFor="primaryColor">Primary color</Label>
					<div className="flex gap-2">
						<Input
							id="primaryColor"
							type="color"
							value={data.primaryColor}
							onChange={(e) => onChange("primaryColor", e.target.value)}
							className="h-8 w-12 cursor-pointer p-0.5"
						/>
						<Input
							value={data.primaryColor}
							onChange={(e) => onChange("primaryColor", e.target.value)}
							placeholder="#3b82f6"
							className="flex-1 font-mono uppercase"
						/>
					</div>
				</div>
				<div className="space-y-2">
					<Label htmlFor="secondaryColor">Secondary color</Label>
					<div className="flex gap-2">
						<Input
							id="secondaryColor"
							type="color"
							value={data.secondaryColor}
							onChange={(e) => onChange("secondaryColor", e.target.value)}
							className="h-8 w-12 cursor-pointer p-0.5"
						/>
						<Input
							value={data.secondaryColor}
							onChange={(e) => onChange("secondaryColor", e.target.value)}
							placeholder="#8b5cf6"
							className="flex-1 font-mono uppercase"
						/>
					</div>
				</div>
			</div>
			<div className="mt-6 flex items-center justify-between">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={handleReset}
					disabled={isSaving}
				>
					<IconRestore className="mr-2 size-4" />
					Reset to defaults
				</Button>
				<Button onClick={onSave} disabled={isSaving}>
					{isSaving && <IconLoader2 className="mr-2 size-4 animate-spin" />}
					Save
				</Button>
			</div>
		</SettingsSection>
	);
}
