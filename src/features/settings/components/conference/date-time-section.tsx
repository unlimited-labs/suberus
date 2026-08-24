import { IconClock } from "@tabler/icons-react";
import { useSelector } from "@tanstack/react-store";
import type { ConferenceSettings } from "@/features/settings/api/settings";
import { SettingsSaveButton } from "@/features/settings/components/settings-save-button";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { Form } from "@/shared/components/composable/form";
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
import { useConferenceFormatForm } from "./use-conference-settings";

interface DateTimeSectionProps {
	initialData: ConferenceSettings;
}

export function DateTimeSection({ initialData }: DateTimeSectionProps) {
	const form = useConferenceFormatForm(initialData);
	const isSubmitting = useSelector(form.store, (s) => s.isSubmitting);
	return (
		<SettingsSection
			delay={200}
			description="Date and time display format across the application"
			icon={IconClock}
			title="Date & Time"
		>
			<Form onSubmit={() => void form.handleSubmit()}>
				<div className="grid gap-6 sm:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="dateFormat">Date Format</Label>
						<form.Field name="dateFormat">
							{(field) => (
								<Select
									items={getDateFormats()}
									onValueChange={(value) => field.handleChange(value ?? "")}
									value={field.state.value}
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
							)}
						</form.Field>
					</div>
					<div className="space-y-3">
						<Label>Time Format</Label>
						<form.Field name="timeFormat">
							{(field) => (
								<RadioGroup
									className="flex gap-6"
									onValueChange={(value) =>
										// SAFETY: the group renders only the two time-format values.
										field.handleChange(value as "24h" | "12h")
									}
									value={field.state.value}
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
							)}
						</form.Field>
					</div>
					<div className="space-y-2 sm:col-span-2">
						<Label htmlFor="timezone">Conference Timezone</Label>
						<form.Field name="timezone">
							{(field) => (
								<TimezoneCombobox
									id="timezone"
									onChange={(v) => field.handleChange(v)}
									value={field.state.value}
								/>
							)}
						</form.Field>
						<p className="text-muted-foreground text-xs">
							All session start/end times are stored in UTC and displayed in
							this zone.
						</p>
					</div>
				</div>
				<SettingsSaveButton isSaving={isSubmitting} testId="save-date-time" />
			</Form>
		</SettingsSection>
	);
}
