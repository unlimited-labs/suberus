import { IconPalette } from "@tabler/icons-react";
import { useSelector } from "@tanstack/react-store";
import { SettingsSaveButton } from "@/features/settings/components/settings-save-button";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { isFieldErrorVisible } from "@/shared/hooks/use-field-error";
import { FieldError } from "@/shared/ui/field";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import type { BrandingFormApi } from "./use-branding-settings";

interface FooterSectionProps {
	form: BrandingFormApi;
}

export function FooterSection({ form }: FooterSectionProps) {
	const submissionAttempts = useSelector(
		form.store,
		(s) => s.submissionAttempts,
	);
	const isSubmitting = useSelector(form.store, (s) => s.isSubmitting);

	return (
		<SettingsSection
			delay={200}
			description="Text displayed in the page footer"
			icon={IconPalette}
			title="Footer"
		>
			<form.Field name="footerText">
				{(field) => {
					const hasError = isFieldErrorVisible(
						field.state.meta,
						submissionAttempts,
					);
					return (
						<div className="space-y-2">
							<Label htmlFor="footerText">Footer text</Label>
							<Textarea
								aria-invalid={hasError}
								className="min-h-20"
								id="footerText"
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								placeholder="© 2026 Conference Name"
								value={field.state.value}
							/>
							<FieldError
								errors={hasError ? field.state.meta.errors : undefined}
							/>
						</div>
					);
				}}
			</form.Field>
			<SettingsSaveButton
				isSaving={isSubmitting}
				onSave={() => void form.handleSubmit()}
			/>
		</SettingsSection>
	);
}
