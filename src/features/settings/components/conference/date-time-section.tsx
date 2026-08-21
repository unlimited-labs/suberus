import { IconClock } from "@tabler/icons-react";
import type { ConferenceSettings } from "@/features/settings/api/settings";
import { SettingsSaveButton } from "@/features/settings/components/settings-save-button";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { getDateFormats } from "@/shared/lib/format-date";
import { Label } from "@/shared/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";
import { TimezoneCombobox } from "@/shared/ui/timezone-combobox";
import type { ConferenceSettingsHandleChange } from "./use-conference-settings";

interface DateTimeSectionProps {
	data: ConferenceSettings;
	onChange: ConferenceSettingsHandleChange;
	onSave: () => void;
	isSaving: boolean;
}

export function DateTimeSection({
	data,
	onChange,
	onSave,
	isSaving,
}: DateTimeSectionProps) {
	return (
		<SettingsSection
			delay={200}
			description="Date and time display format across the application"
			icon={IconClock}
			title="Date & Time"
		>
			<div className="grid gap-6 sm:grid-cols-2">
				<div className="space-y-2">
					<Label htmlFor="dateFormat">Date Format</Label>
					<Select
						items={getDateFormats()}
						onValueChange={(value) => onChange("dateFormat", value)}
						value={data.dateFormat}
					>
						<SelectTrigger id="dateFormat">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{getDateFormats().map((fmt) => (
								<SelectItem
									data-testid={`date-format-option-${fmt.value}`}
									key={fmt.value}
									value={fmt.value}
								>
									{fmt.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="space-y-3">
					<Label>Time Format</Label>
					<RadioGroup
						className="flex gap-6"
						onValueChange={(value) => onChange("timeFormat", value)}
						value={data.timeFormat}
					>
						<div className="flex items-center gap-2">
							<RadioGroupItem id="time-24h" value="24h" />
							<Label className="cursor-pointer" htmlFor="time-24h">
								24h (14:30)
							</Label>
						</div>
						<div className="flex items-center gap-2">
							<RadioGroupItem id="time-12h" value="12h" />
							<Label className="cursor-pointer" htmlFor="time-12h">
								12h (2:30 PM)
							</Label>
						</div>
					</RadioGroup>
				</div>
				<div className="space-y-2 sm:col-span-2">
					<Label htmlFor="timezone">Conference Timezone</Label>
					<TimezoneCombobox
						id="timezone"
						onChange={(v) => onChange("timezone", v)}
						value={data.timezone}
					/>
					<p className="text-xs text-muted-foreground">
						All session start/end times are stored in UTC and displayed in this
						zone.
					</p>
				</div>
			</div>
			<SettingsSaveButton isSaving={isSaving} onSave={onSave} />
		</SettingsSection>
	);
}
