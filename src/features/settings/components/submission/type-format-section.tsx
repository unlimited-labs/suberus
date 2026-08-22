import {
	SUPPORTED_FILE_EXTENSIONS,
	type SupportedFileExtension,
} from "@/features/settings/file-types";
import type { ContentFormat } from "@/features/settings/types";
import { isFieldErrorVisible } from "@/shared/hooks/use-field-error";
import { FieldError } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";
import type { SubmissionTypeFormApi } from "./use-submission-type-config";

const CONTENT_FORMATS = [
	"TEXT",
	"FILE",
] as const satisfies readonly ContentFormat[];

interface TypeFormatSectionProps {
	form: SubmissionTypeFormApi;
	submissionAttempts: number;
}

export function TypeFormatSection({
	form,
	submissionAttempts,
}: TypeFormatSectionProps) {
	return (
		<div className="space-y-3">
			<div className="space-y-0.5">
				<Label>Content Format</Label>
				<p className="text-muted-foreground/70 text-xs italic">
					How authors provide their submission content
				</p>
			</div>
			<form.Field name="contentFormat">
				{(field) => (
					<Select
						items={[
							{ value: "TEXT", label: "Text (Abstract)" },
							{ value: "FILE", label: "File Upload" },
						]}
						onValueChange={(value) => {
							const found = CONTENT_FORMATS.find((f) => f === value);
							if (found) field.handleChange(found);
						}}
						value={field.state.value}
					>
						<SelectTrigger className="max-w-64">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="TEXT">Text (Abstract)</SelectItem>
							<SelectItem value="FILE">File Upload</SelectItem>
						</SelectContent>
					</Select>
				)}
			</form.Field>

			<form.Subscribe selector={(s) => s.values.contentFormat}>
				{(contentFormat) =>
					contentFormat === "FILE" ? (
						<div className="space-y-2 pt-2 pl-0 sm:pl-4">
							<Label className="text-sm">Allowed file extension</Label>
							<form.Field name="allowedExtensions">
								{(field) => (
									<>
										<RadioGroup
											className="flex flex-wrap gap-3"
											onValueChange={(value) =>
												// SAFETY: the group renders only supported extensions.
												field.handleChange([value as SupportedFileExtension])
											}
											value={field.state.value[0] ?? ""}
										>
											{SUPPORTED_FILE_EXTENSIONS.map((ext) => (
												<div className="flex items-center gap-2" key={ext}>
													<RadioGroupItem id={`ext-${ext}`} value={ext} />
													<Label
														className="cursor-pointer text-sm uppercase"
														htmlFor={`ext-${ext}`}
													>
														{ext}
													</Label>
												</div>
											))}
										</RadioGroup>
										{field.state.value.length === 0 && (
											<p className="text-destructive text-xs">
												Select an allowed file extension
											</p>
										)}
										<FieldError
											errors={
												isFieldErrorVisible(
													field.state.meta,
													submissionAttempts,
												)
													? field.state.meta.errors
													: undefined
											}
										/>
									</>
								)}
							</form.Field>

							<div className="space-y-2 pt-2">
								<form.Field name="maxFileSizeMb">
									{(field) => {
										const hasError = isFieldErrorVisible(
											field.state.meta,
											submissionAttempts,
										);
										return (
											<>
												<Label className="text-sm" htmlFor="max-file-size-FILE">
													Max file size (MB)
												</Label>
												<Input
													aria-invalid={hasError}
													className="max-w-32"
													id="max-file-size-FILE"
													max={100}
													min={1}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
													type="number"
													value={field.state.value}
												/>
												<FieldError
													errors={
														hasError ? field.state.meta.errors : undefined
													}
												/>
											</>
										);
									}}
								</form.Field>
							</div>
						</div>
					) : null
				}
			</form.Subscribe>
		</div>
	);
}
