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
			icon={IconClock}
			title="Date & Time"
			description="Date and time display format across the application"
			delay={200}
		>
			<div className="grid gap-6 sm:grid-cols-2">
				<div className="space-y-2">
					<Label htmlFor="dateFormat">Date Format</Label>
					<Select
						items={getDateFormats()}
						value={data.dateFormat}
						onValueChange={(value) => onChange("dateFormat", value)}
					>
						<SelectTrigger id="dateFormat">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{getDateFormats().map((fmt) => (
								<SelectItem
									key={fmt.value}
									value={fmt.value}
									data-testid={`date-format-option-${fmt.value}`}
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
						value={data.timeFormat}
						onValueChange={(value) => onChange("timeFormat", value)}
						className="flex gap-6"
					>
						<div className="flex items-center gap-2">
							<RadioGroupItem value="24h" id="time-24h" />
							<Label htmlFor="time-24h" className="cursor-pointer">
								24h (14:30)
							</Label>
						</div>
						<div className="flex items-center gap-2">
							<RadioGroupItem value="12h" id="time-12h" />
							<Label htmlFor="time-12h" className="cursor-pointer">
								12h (2:30 PM)
							</Label>
						</div>
					</RadioGroup>
				</div>
				<div className="space-y-2 sm:col-span-2">
					<Label htmlFor="timezone">Conference Timezone</Label>
					<TimezoneCombobox
						id="timezone"
						value={data.timezone}
						onChange={(v) => onChange("timezone", v)}
					/>
					<p className="text-xs text-muted-foreground">
						All session start/end times are stored in UTC and displayed in this
						zone.
					</p>
				</div>
			</div>
			<SettingsSaveButton onSave={onSave} isSaving={isSaving} />
		</SettingsSection>
	);
}
