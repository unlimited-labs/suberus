import { IconFileText } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useSelector } from "@tanstack/react-store";
import { toast } from "sonner";
import {
	adminSettingQueryOptions,
	updateTosContentFn,
} from "@/features/settings/api/settings";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { tosContentSchema } from "@/features/settings/validations";
import { Form } from "@/shared/components/composable/form";
import { useAppForm } from "@/shared/hooks/use-app-form";
import { isFieldErrorVisible } from "@/shared/hooks/use-field-error";
import { getErrorMessage } from "@/shared/lib/error-message";
import { CodeArea } from "@/shared/ui/code-area";
import { FieldError } from "@/shared/ui/field";
import { Label } from "@/shared/ui/label";
import { Markdown, MarkdownHint } from "@/shared/ui/markdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

interface TosContentTabProps {
	initialContent: string;
}

export function TosContentTab({ initialContent }: TosContentTabProps) {
	const queryClient = useQueryClient();

	const form = useAppForm({
		defaultValues: { content: initialContent },
		validators: { onChange: tosContentSchema, onSubmit: tosContentSchema },
		onSubmit: async ({ value }) => {
			try {
				await updateTosContentFn({ data: value });
				await queryClient.invalidateQueries({
					queryKey: adminSettingQueryOptions("TOS_CONTENT").queryKey,
				});
				toast.success("Terms of Service saved");
			} catch (error) {
				toast.error(getErrorMessage(error, "Failed to save Terms of Service"));
			}
		},
	});

	const submissionAttempts = useSelector(
		form.store,
		(s) => s.submissionAttempts,
	);

	return (
		<div className="space-y-6">
			<SettingsSection
				description="Configure Terms of Service content shown during registration (Markdown supported)"
				icon={IconFileText}
				title="Terms of Service"
			>
				<Form
					className="space-y-4"
					onSubmit={() => {
						void form.handleSubmit();
					}}
				>
					<form.Field name="content">
						{(field) => {
							const hasError = isFieldErrorVisible(
								field.state.meta,
								submissionAttempts,
							);
							return (
								<div className="space-y-2">
									<Label htmlFor="tos-content">Content</Label>
									<Tabs defaultValue="edit">
										<TabsList>
											<TabsTrigger value="edit">Edit</TabsTrigger>
											<TabsTrigger value="preview">Preview</TabsTrigger>
										</TabsList>
										<TabsContent value="edit">
											<CodeArea
												aria-invalid={hasError}
												className="font-mono text-sm"
												id="tos-content"
												lang="markdown"
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="# Terms of Service&#10;&#10;Enter terms of service here..."
												rows={15}
												value={field.state.value}
											/>
										</TabsContent>
										<TabsContent value="preview">
											<div className="min-h-[22rem] rounded-md border p-4">
												{field.state.value.trim() ? (
													<Markdown content={field.state.value} />
												) : (
													<p className="text-muted-foreground text-sm">
														Nothing to preview yet
													</p>
												)}
											</div>
										</TabsContent>
									</Tabs>
									<FieldError
										errors={hasError ? field.state.meta.errors : undefined}
									/>
									<MarkdownHint />
								</div>
							);
						}}
					</form.Field>

					<div className="flex justify-end">
						<form.AppForm>
							<form.SubmitButton label="Save Terms of Service" />
						</form.AppForm>
					</div>
				</Form>
			</SettingsSection>
		</div>
	);
}
