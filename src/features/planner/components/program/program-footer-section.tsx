import { IconPhoto } from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "@tanstack/react-store";
import parse from "html-react-parser";
import { toast } from "sonner";
import { updateProgramFooterHtmlFn } from "@/features/planner/api/footer";
import { adminSettingQueryOptions } from "@/features/settings/api/settings";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { programFooterHtmlSchema } from "@/features/settings/validations";
import { Form } from "@/shared/components/composable/form";
import { useAppForm } from "@/shared/hooks/use-app-form";
import { isFieldErrorVisible } from "@/shared/hooks/use-field-error";
import { getErrorMessage } from "@/shared/lib/error-message";
import { FieldError } from "@/shared/ui/field";
import { Label } from "@/shared/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Textarea } from "@/shared/ui/textarea";

export function ProgramFooterSection() {
	const queryClient = useQueryClient();
	const { data: savedHtml } = useQuery(
		adminSettingQueryOptions("PROGRAM_FOOTER_HTML"),
	);

	const form = useAppForm({
		defaultValues: { html: savedHtml ?? "" },
		validators: {
			onChange: programFooterHtmlSchema,
			onSubmit: programFooterHtmlSchema,
		},
		onSubmit: async ({ value }) => {
			try {
				await updateProgramFooterHtmlFn({ data: value });
				await queryClient.invalidateQueries({
					queryKey: adminSettingQueryOptions("PROGRAM_FOOTER_HTML").queryKey,
				});
				toast.success("Footer content saved");
			} catch (error) {
				toast.error(getErrorMessage(error, "Failed to save footer content"));
			}
		},
	});

	const submissionAttempts = useSelector(
		form.store,
		(s) => s.submissionAttempts,
	);

	return (
		<SettingsSection
			description="Custom HTML shown at the bottom of the public program page, e.g. partner/sponsor logos. Tailwind classes are supported; scripts are stripped."
			icon={IconPhoto}
			title="Footer content"
		>
			<Form
				className="space-y-4"
				onSubmit={() => {
					void form.handleSubmit();
				}}
			>
				<form.Field name="html">
					{(field) => {
						const hasError = isFieldErrorVisible(
							field.state.meta,
							submissionAttempts,
						);
						return (
							<div className="space-y-2">
								<Label htmlFor="program-footer-html">HTML</Label>
								<Tabs defaultValue="edit">
									<TabsList>
										<TabsTrigger value="edit">Edit</TabsTrigger>
										<TabsTrigger value="preview">Preview</TabsTrigger>
									</TabsList>
									<TabsContent value="edit">
										<Textarea
											aria-invalid={hasError}
											className="font-mono text-sm"
											id="program-footer-html"
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											placeholder='<div class="flex justify-center gap-6"><img src="https://example.org/logo.svg" alt="Sponsor" class="h-14" /></div>'
											rows={12}
											value={field.state.value}
										/>
									</TabsContent>
									<TabsContent value="preview">
										<PreviewSavedFooter />
									</TabsContent>
								</Tabs>
								<FieldError
									errors={hasError ? field.state.meta.errors : undefined}
								/>
								<p className="text-muted-foreground text-xs">
									Preview shows the saved, sanitized version — save first to see
									changes reflected here.
								</p>
							</div>
						);
					}}
				</form.Field>

				<div className="flex justify-end">
					<form.AppForm>
						<form.SubmitButton label="Save footer content" />
					</form.AppForm>
				</div>
			</Form>
		</SettingsSection>
	);
}

function PreviewSavedFooter() {
	const { data: html } = useQuery(
		adminSettingQueryOptions("PROGRAM_FOOTER_HTML"),
	);
	return (
		<div className="min-h-[8rem] rounded-md border p-4">
			{html?.trim() ? (
				parse(html)
			) : (
				<p className="text-muted-foreground text-sm">Nothing to preview yet</p>
			)}
		</div>
	);
}
