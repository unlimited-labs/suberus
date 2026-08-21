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
			delay={100}
			description="Customize interface colors"
			icon={IconPalette}
			title="Theme Colors"
		>
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-2">
					<Label htmlFor="primaryColor">Primary color</Label>
					<div className="flex gap-2">
						<Input
							className="h-8 w-12 cursor-pointer p-0.5"
							id="primaryColor"
							onChange={(e) => onChange("primaryColor", e.target.value)}
							type="color"
							value={data.primaryColor}
						/>
						<Input
							className="flex-1 font-mono uppercase"
							onChange={(e) => onChange("primaryColor", e.target.value)}
							placeholder="#3b82f6"
							value={data.primaryColor}
						/>
					</div>
				</div>
				<div className="space-y-2">
					<Label htmlFor="secondaryColor">Secondary color</Label>
					<div className="flex gap-2">
						<Input
							className="h-8 w-12 cursor-pointer p-0.5"
							id="secondaryColor"
							onChange={(e) => onChange("secondaryColor", e.target.value)}
							type="color"
							value={data.secondaryColor}
						/>
						<Input
							className="flex-1 font-mono uppercase"
							onChange={(e) => onChange("secondaryColor", e.target.value)}
							placeholder="#8b5cf6"
							value={data.secondaryColor}
						/>
					</div>
				</div>
			</div>
			<div className="mt-6 flex items-center justify-between">
				<Button
					disabled={isSaving}
					onClick={handleReset}
					size="sm"
					type="button"
					variant="ghost"
				>
					<IconRestore className="mr-2 size-4" />
					Reset to defaults
				</Button>
				<Button disabled={isSaving} onClick={onSave}>
					{isSaving && <IconLoader2 className="mr-2 size-4 animate-spin" />}
					Save
				</Button>
			</div>
		</SettingsSection>
	);
}
