import { IconFileStack } from "@tabler/icons-react";
import { useState } from "react";
import { SettingsSection } from "@/components/settings/settings-section";
import { Accordion } from "@/components/ui/accordion";
import type { SubmissionTypeSettings } from "@/lib/mock-data/admin-settings";
import { SubmissionTypeAccordion } from "./submission-type-accordion";

interface SubmissionTypesTabProps {
	initialData: SubmissionTypeSettings[];
}

export function SubmissionTypesTab({ initialData }: SubmissionTypesTabProps) {
	const [types, setTypes] = useState(initialData);

	const handleTypeChange = (updated: SubmissionTypeSettings) => {
		setTypes((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
	};

	return (
		<SettingsSection
			icon={IconFileStack}
			title="Submission Types"
			description="Configure individual submission types"
		>
			<Accordion type="single" collapsible className="space-y-3">
				{types.map((type) => (
					<SubmissionTypeAccordion
						key={type.id}
						type={type}
						onChange={handleTypeChange}
					/>
				))}
			</Accordion>
		</SettingsSection>
	);
}
