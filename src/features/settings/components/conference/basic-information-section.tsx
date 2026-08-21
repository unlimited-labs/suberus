import { IconBuilding, IconMail, IconWorld } from "@tabler/icons-react";
import type { ConferenceSettings } from "@/features/settings/api/settings";
import { SettingsSaveButton } from "@/features/settings/components/settings-save-button";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";
import type { ConferenceSettingsHandleChange } from "./use-conference-settings";

interface BasicInformationSectionProps {
	data: ConferenceSettings;
	onChange: ConferenceSettingsHandleChange;
	onSave: () => void;
	isSaving: boolean;
}

export function BasicInformationSection({
	data,
	onChange,
	onSave,
	isSaving,
}: BasicInformationSectionProps) {
	return (
		<SettingsSection
			description="Conference name, location and contact details"
			icon={IconBuilding}
			title="Basic Information"
		>
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-2 sm:col-span-2">
					<Label htmlFor="name">Conference Name</Label>
					<Input
						id="name"
						onChange={(e) => onChange("name", e.target.value)}
						placeholder="e.g. ICSE 2026"
						value={data.name}
					/>
				</div>
				<div className="space-y-2 sm:col-span-2">
					<Label htmlFor="subtitle">Conference Subtitle (optional)</Label>
					<Input
						id="subtitle"
						onChange={(e) => onChange("subtitle", e.target.value)}
						placeholder="e.g. International Conference on Computer Methods in Materials Technology"
						value={data.subtitle}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="location">Location</Label>
					<Input
						id="location"
						onChange={(e) => onChange("location", e.target.value)}
						placeholder="e.g. Krakow, Poland"
						value={data.location}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="website">Website</Label>
					<div className="relative">
						<IconWorld className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							className="pl-8"
							id="website"
							onChange={(e) => onChange("website", e.target.value)}
							placeholder="https://..."
							type="url"
							value={data.website}
						/>
					</div>
				</div>
				<div className="space-y-2 sm:col-span-2">
					<Label htmlFor="contactEmail">Contact Email</Label>
					<div className="relative">
						<IconMail className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							className="pl-8"
							id="contactEmail"
							onChange={(e) => onChange("contactEmail", e.target.value)}
							placeholder="contact@conference.com"
							type="email"
							value={data.contactEmail}
						/>
					</div>
				</div>
				<div className="space-y-2">
					<Label htmlFor="currency">Currency</Label>
					<Select
						onValueChange={(value) => onChange("currency", value)}
						value={data.currency}
					>
						<SelectTrigger id="currency">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="EUR">EUR</SelectItem>
							<SelectItem value="USD">USD</SelectItem>
							<SelectItem value="PLN">PLN</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>
			<SettingsSaveButton isSaving={isSaving} onSave={onSave} />
		</SettingsSection>
	);
}
