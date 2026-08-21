import type { ConferenceSettings } from "@/features/settings/api/settings";
import type { SubmissionTypeConfig } from "@/features/settings/types";
import { BasicInformationSection } from "./basic-information-section";
import { DateTimeSection } from "./date-time-section";
import { ExhibitorsSettingsSection } from "./exhibitors-settings-section";
import { ImportantDatesSection } from "./important-dates-section";
import { useConferenceSettings } from "./use-conference-settings";

interface ConferenceSettingsTabProps {
	initialData: ConferenceSettings;
	initialExhibitorConfig: SubmissionTypeConfig;
}

export function ConferenceSettingsTab({
	initialData,
	initialExhibitorConfig,
}: ConferenceSettingsTabProps) {
	const { data, isSaving, handleChange, handleToggle, handleSave } =
		useConferenceSettings(initialData);

	return (
		<div className="space-y-6">
			<BasicInformationSection
				data={data}
				isSaving={isSaving}
				onChange={handleChange}
				onSave={handleSave}
			/>

			<ImportantDatesSection
				data={data}
				isSaving={isSaving}
				onChange={handleChange}
				onSave={handleSave}
				onToggle={handleToggle}
			/>

			<DateTimeSection
				data={data}
				isSaving={isSaving}
				onChange={handleChange}
				onSave={handleSave}
			/>

			<ExhibitorsSettingsSection
				delay={300}
				initialConfig={initialExhibitorConfig}
			/>
		</div>
	);
}
