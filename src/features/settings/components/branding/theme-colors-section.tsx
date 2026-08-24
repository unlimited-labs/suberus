import { IconLoader2, IconPalette, IconRestore } from "@tabler/icons-react";
import { useSelector } from "@tanstack/react-store";
import type { BrandingSettings } from "@/features/settings/api/settings";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { APP_SETTINGS_DEFAULTS } from "@/features/settings/defaults";
import { Form } from "@/shared/components/composable/form";
import { isFieldErrorVisible } from "@/shared/hooks/use-field-error";
import { Button } from "@/shared/ui/button";
import { FieldError } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
	type BrandingColorsFormApi,
	useBrandingColorsForm,
} from "./use-branding-settings";

interface ThemeColorsSectionProps {
	initialData: BrandingSettings;
}

interface ColorFieldProps {
	form: BrandingColorsFormApi;
	name: "primaryColor" | "secondaryColor";
	label: string;
	placeholder: string;
	submissionAttempts: number;
}

function ColorField({
	form,
	name,
	label,
	placeholder,
	submissionAttempts,
}: ColorFieldProps) {
	return (
		<form.Field name={name}>
			{(field) => {
				const hasError = isFieldErrorVisible(
					field.state.meta,
					submissionAttempts,
				);
				return (
					<div className="space-y-2">
						<Label htmlFor={name}>{label}</Label>
						<div className="flex gap-2">
							<Input
								className="h-8 w-12 cursor-pointer p-0.5"
								id={name}
								onChange={(e) => field.handleChange(e.target.value)}
								type="color"
								value={field.state.value}
							/>
							<Input
								aria-invalid={hasError}
								className="flex-1 font-mono uppercase"
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								placeholder={placeholder}
								value={field.state.value}
							/>
						</div>
						<FieldError
							errors={hasError ? field.state.meta.errors : undefined}
						/>
					</div>
				);
			}}
		</form.Field>
	);
}

export function ThemeColorsSection({ initialData }: ThemeColorsSectionProps) {
	const form = useBrandingColorsForm(initialData);
	const submissionAttempts = useSelector(
		form.store,
		(s) => s.submissionAttempts,
	);

	const handleReset = () => {
		form.setFieldValue(
			"primaryColor",
			APP_SETTINGS_DEFAULTS.BRANDING_PRIMARY_COLOR,
		);
		form.setFieldValue(
			"secondaryColor",
			APP_SETTINGS_DEFAULTS.BRANDING_SECONDARY_COLOR,
		);
	};

	return (
		<SettingsSection
			delay={100}
			description="Customize interface colors"
			icon={IconPalette}
			title="Theme Colors"
		>
			<Form onSubmit={() => void form.handleSubmit()}>
				<div className="grid gap-4 sm:grid-cols-2">
					<ColorField
						form={form}
						label="Primary color"
						name="primaryColor"
						placeholder="#3b82f6"
						submissionAttempts={submissionAttempts}
					/>
					<ColorField
						form={form}
						label="Secondary color"
						name="secondaryColor"
						placeholder="#8b5cf6"
						submissionAttempts={submissionAttempts}
					/>
				</div>
				<form.Subscribe selector={(s) => s.isSubmitting}>
					{(isSubmitting) => (
						<div className="mt-6 flex items-center justify-between">
							<Button
								disabled={isSubmitting}
								onClick={handleReset}
								size="sm"
								type="button"
								variant="ghost"
							>
								<IconRestore className="mr-2 size-4" />
								Reset to defaults
							</Button>
							<Button
								data-testid="save-theme-colors"
								disabled={isSubmitting}
								type="submit"
							>
								{isSubmitting && (
									<IconLoader2 className="mr-2 size-4 animate-spin" />
								)}
								Save
							</Button>
						</div>
					)}
				</form.Subscribe>
			</Form>
		</SettingsSection>
	);
}
