import { IconPalette } from "@tabler/icons-react";
import { useSelector } from "@tanstack/react-store";
import type { BrandingSettings } from "@/features/settings/api/settings";
import { SettingsSaveButton } from "@/features/settings/components/settings-save-button";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { Form } from "@/shared/components/composable/form";
import { useBrandingFooterForm } from "./use-branding-settings";

interface FooterSectionProps {
	initialData: BrandingSettings;
}

export function FooterSection({ initialData }: FooterSectionProps) {
	const form = useBrandingFooterForm(initialData);
	const isSubmitting = useSelector(form.store, (s) => s.isSubmitting);

	return (
		<SettingsSection
			delay={200}
			description="Text displayed in the page footer"
			icon={IconPalette}
			title="Footer"
		>
			<Form onSubmit={() => void form.handleSubmit()}>
				<form.AppField name="footerText">
					{(field) => (
						<field.TextareaField
							className="min-h-20"
							label="Footer text"
							placeholder="© 2026 Conference Name"
						/>
					)}
				</form.AppField>
				<SettingsSaveButton
					isSaving={isSubmitting}
					testId="save-branding-footer"
				/>
			</Form>
		</SettingsSection>
	);
}
