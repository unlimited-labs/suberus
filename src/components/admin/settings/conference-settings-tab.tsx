import {
	IconBuilding,
	IconCalendar,
	IconClock,
	IconLoader2,
	IconMail,
	IconWorld,
} from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { getDateFormats } from "@/lib/format-date";
import type { ConferenceSettings } from "@/utils/settings.functions";
import { updateConferenceSettingsFn } from "@/utils/settings.functions";

interface ConferenceSettingsTabProps {
	initialData: ConferenceSettings;
}

export function ConferenceSettingsTab({
	initialData,
}: ConferenceSettingsTabProps) {
	const [data, setData] = useState(initialData);
	const [isSaving, setIsSaving] = useState(false);

	const handleChange = (field: keyof ConferenceSettings, value: string) => {
		setData((prev) => ({ ...prev, [field]: value }));
	};

	const handleSave = async () => {
		setIsSaving(true);
		try {
			await updateConferenceSettingsFn({ data });
			toast.success("Conference settings saved");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to save");
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="space-y-6">
			<SettingsSection
				icon={IconBuilding}
				title="Basic Information"
				description="Conference name, location and contact details"
			>
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-2 sm:col-span-2">
						<Label htmlFor="name">Conference Name</Label>
						<Input
							id="name"
							value={data.name}
							onChange={(e) => handleChange("name", e.target.value)}
							placeholder="e.g. ICSE 2026"
						/>
					</div>
					<div className="space-y-2 sm:col-span-2">
						<Label htmlFor="subtitle">Conference Subtitle (optional)</Label>
						<Input
							id="subtitle"
							value={data.subtitle}
							onChange={(e) => handleChange("subtitle", e.target.value)}
							placeholder="e.g. International Conference on Computer Methods in Materials Technology"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="location">Location</Label>
						<Input
							id="location"
							value={data.location}
							onChange={(e) => handleChange("location", e.target.value)}
							placeholder="e.g. Krakow, Poland"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="website">Website</Label>
						<div className="relative">
							<IconWorld className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								id="website"
								type="url"
								value={data.website}
								onChange={(e) => handleChange("website", e.target.value)}
								placeholder="https://..."
								className="pl-8"
							/>
						</div>
					</div>
					<div className="space-y-2 sm:col-span-2">
						<Label htmlFor="contactEmail">Contact Email</Label>
						<div className="relative">
							<IconMail className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								id="contactEmail"
								type="email"
								value={data.contactEmail}
								onChange={(e) => handleChange("contactEmail", e.target.value)}
								placeholder="contact@conference.com"
								className="pl-8"
							/>
						</div>
					</div>
				</div>
				<div className="mt-6 flex justify-end">
					<Button onClick={handleSave} disabled={isSaving}>
						{isSaving && <IconLoader2 className="mr-2 size-4 animate-spin" />}
						Save
					</Button>
				</div>
			</SettingsSection>

			<SettingsSection
				icon={IconCalendar}
				title="Important Dates"
				description="Conference, submission and review deadlines"
				delay={100}
			>
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="conferenceStartDate">Conference Start</Label>
						<Input
							id="conferenceStartDate"
							type="date"
							value={data.conferenceStartDate}
							onChange={(e) =>
								handleChange("conferenceStartDate", e.target.value)
							}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="conferenceEndDate">Conference End</Label>
						<Input
							id="conferenceEndDate"
							type="date"
							value={data.conferenceEndDate}
							onChange={(e) =>
								handleChange("conferenceEndDate", e.target.value)
							}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="submissionDeadline">Submission Deadline</Label>
						<Input
							id="submissionDeadline"
							type="date"
							value={data.submissionDeadline}
							onChange={(e) =>
								handleChange("submissionDeadline", e.target.value)
							}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="reviewDeadline">Review Deadline</Label>
						<Input
							id="reviewDeadline"
							type="date"
							value={data.reviewDeadline}
							onChange={(e) => handleChange("reviewDeadline", e.target.value)}
						/>
					</div>
					<div className="space-y-2 sm:col-span-2">
						<Label htmlFor="notificationDate">Notification Date</Label>
						<Input
							id="notificationDate"
							type="date"
							value={data.notificationDate}
							onChange={(e) => handleChange("notificationDate", e.target.value)}
						/>
					</div>
				</div>
				<div className="mt-6 flex justify-end">
					<Button onClick={handleSave} disabled={isSaving}>
						{isSaving && <IconLoader2 className="mr-2 size-4 animate-spin" />}
						Save
					</Button>
				</div>
			</SettingsSection>

			<SettingsSection
				icon={IconClock}
				title="Display Format"
				description="Date and time display format across the application"
				delay={200}
			>
				<div className="grid gap-6 sm:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="dateFormat">Date Format</Label>
						<Select
							value={data.dateFormat}
							onValueChange={(value) => handleChange("dateFormat", value)}
						>
							<SelectTrigger id="dateFormat">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{getDateFormats().map((fmt) => (
									<SelectItem key={fmt.value} value={fmt.value}>
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
							onValueChange={(value) => handleChange("timeFormat", value)}
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
				</div>
				<div className="mt-6 flex justify-end">
					<Button onClick={handleSave} disabled={isSaving}>
						{isSaving && <IconLoader2 className="mr-2 size-4 animate-spin" />}
						Save
					</Button>
				</div>
			</SettingsSection>
		</div>
	);
}
