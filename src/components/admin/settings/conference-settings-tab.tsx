import {
	IconBuilding,
	IconCalendar,
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
import type { ConferenceSettings } from "@/lib/mock-data/admin-settings";

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
			await new Promise((resolve) => setTimeout(resolve, 800));
			toast.success("Conference settings saved");
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
		</div>
	);
}
