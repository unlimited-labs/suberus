import { IconBuildingStore } from "@tabler/icons-react";
import type { ExhibitorApplicationFormApi } from "./use-exhibitor-application-form";

interface ExhibitorCompanySectionProps {
	form: ExhibitorApplicationFormApi;
}

export function ExhibitorCompanySection({
	form,
}: ExhibitorCompanySectionProps) {
	return (
		<div className="space-y-4">
			<div className="flex items-center gap-3">
				<IconBuildingStore className="size-5 text-muted-foreground" />
				<h2 className="text-lg font-semibold text-foreground">
					Company details
				</h2>
			</div>

			<div className="space-y-4">
				<form.AppField name="companyName">
					{(field) => (
						<field.InputField
							label="Company name"
							testId="exhibitor-company-name"
						/>
					)}
				</form.AppField>

				<form.AppField name="description">
					{(field) => (
						<field.TextareaField
							description="Shown in conference materials"
							label="Description"
							rows={5}
							testId="exhibitor-description"
						/>
					)}
				</form.AppField>

				<form.AppField name="website">
					{(field) => (
						<field.InputField
							label="Website"
							placeholder="https://example.com"
							testId="exhibitor-website"
						/>
					)}
				</form.AppField>
			</div>
		</div>
	);
}
