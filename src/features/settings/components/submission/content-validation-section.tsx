import { IconFileText } from "@tabler/icons-react";
import { useSelector } from "@tanstack/react-store";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { isFieldErrorVisible } from "@/shared/hooks/use-field-error";
import { FieldError } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import type { SubmissionSettingsFormApi } from "./use-submission-settings";

interface ValidationFieldsProps {
	form: SubmissionSettingsFormApi;
	submissionAttempts: number;
}

type NumericField =
	| "minTitleLength"
	| "maxTitleLength"
	| "minAbstractLength"
	| "maxAbstractLength"
	| "minKeywords"
	| "maxKeywords";

interface NumberFieldProps extends ValidationFieldsProps {
	name: NumericField;
	label: string;
	labelClassName?: string;
	min: number;
	max: number;
}

function NumberField({
	form,
	submissionAttempts,
	name,
	label,
	labelClassName,
	min,
	max,
}: NumberFieldProps) {
	return (
		<form.Field name={name}>
			{(field) => {
				const hasError = isFieldErrorVisible(
					field.state.meta,
					submissionAttempts,
				);
				return (
					<div className="space-y-2">
						<Label className={labelClassName} htmlFor={name}>
							{label}
						</Label>
						<Input
							aria-invalid={hasError}
							id={name}
							max={max}
							min={min}
							onBlur={field.handleBlur}
							onChange={(e) => field.handleChange(e.target.value)}
							type="number"
							value={field.state.value}
						/>
						<FieldError
							errors={hasError ? field.state.meta.errors : undefined}
						/>
					</div>
				);
			}}
		</form.Field>
	);
}

const subLabel = "text-muted-foreground text-xs";

function TitleFields({ form, submissionAttempts }: ValidationFieldsProps) {
	return (
		<div className="space-y-3">
			<Label className="text-sm font-medium">Title</Label>
			<div className="grid gap-4 sm:grid-cols-2">
				<NumberField
					form={form}
					label="Min length (characters)"
					labelClassName={subLabel}
					max={500}
					min={1}
					name="minTitleLength"
					submissionAttempts={submissionAttempts}
				/>
				<NumberField
					form={form}
					label="Max length (characters)"
					labelClassName={subLabel}
					max={1000}
					min={10}
					name="maxTitleLength"
					submissionAttempts={submissionAttempts}
				/>
			</div>
			<form.Subscribe
				selector={(s) =>
					Number(s.values.minTitleLength) > Number(s.values.maxTitleLength)
				}
			>
				{(exceeds) =>
					exceeds ? (
						<p className="text-destructive text-xs">
							Min length cannot exceed max length
						</p>
					) : null
				}
			</form.Subscribe>
		</div>
	);
}

function AbstractFields({ form, submissionAttempts }: ValidationFieldsProps) {
	return (
		<div className="space-y-3">
			<Label className="text-sm font-medium">Abstract</Label>
			<p className="text-muted-foreground -mt-2 text-xs">
				For TEXT format submissions
			</p>
			<div className="grid gap-4 sm:grid-cols-2">
				<NumberField
					form={form}
					label="Min length (characters)"
					labelClassName={subLabel}
					max={10000}
					min={0}
					name="minAbstractLength"
					submissionAttempts={submissionAttempts}
				/>
				<NumberField
					form={form}
					label="Max length (characters)"
					labelClassName={subLabel}
					max={50000}
					min={100}
					name="maxAbstractLength"
					submissionAttempts={submissionAttempts}
				/>
			</div>
			<form.Subscribe
				selector={(s) =>
					Number(s.values.minAbstractLength) >
					Number(s.values.maxAbstractLength)
				}
			>
				{(exceeds) =>
					exceeds ? (
						<p className="text-destructive text-xs">
							Min length cannot exceed max length
						</p>
					) : null
				}
			</form.Subscribe>
		</div>
	);
}

function KeywordsFields({ form, submissionAttempts }: ValidationFieldsProps) {
	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div className="space-y-0.5">
					<Label htmlFor="enableKeywords">Enable keywords</Label>
					<p className="text-muted-foreground text-sm">
						Authors can add keywords to submissions
					</p>
				</div>
				<form.Field name="enableKeywords">
					{(field) => (
						<Switch
							checked={field.state.value}
							id="enableKeywords"
							onCheckedChange={(checked) =>
								field.handleChange(checked === true)
							}
						/>
					)}
				</form.Field>
			</div>
			<form.Subscribe selector={(s) => s.values.enableKeywords}>
				{(enabled) =>
					enabled ? (
						<div className="grid gap-4 sm:grid-cols-2">
							<NumberField
								form={form}
								label="Min keywords"
								max={20}
								min={0}
								name="minKeywords"
								submissionAttempts={submissionAttempts}
							/>
							<NumberField
								form={form}
								label="Max keywords"
								max={20}
								min={1}
								name="maxKeywords"
								submissionAttempts={submissionAttempts}
							/>
						</div>
					) : null
				}
			</form.Subscribe>
			<form.Subscribe
				selector={(s) =>
					s.values.enableKeywords &&
					Number(s.values.minKeywords) > Number(s.values.maxKeywords)
				}
			>
				{(exceeds) =>
					exceeds ? (
						<p className="text-destructive text-xs">
							Min keywords cannot exceed max keywords
						</p>
					) : null
				}
			</form.Subscribe>
		</div>
	);
}

interface ContentValidationSectionProps {
	form: SubmissionSettingsFormApi;
}

export function ContentValidationSection({
	form,
}: ContentValidationSectionProps) {
	const submissionAttempts = useSelector(
		form.store,
		(s) => s.submissionAttempts,
	);

	return (
		<SettingsSection
			description="Title, abstract and keyword restrictions"
			icon={IconFileText}
			title="Content Validation"
		>
			<div className="space-y-6">
				<TitleFields form={form} submissionAttempts={submissionAttempts} />
				<hr className="border-border/50" />
				<AbstractFields form={form} submissionAttempts={submissionAttempts} />
				<hr className="border-border/50" />
				<KeywordsFields form={form} submissionAttempts={submissionAttempts} />
			</div>
		</SettingsSection>
	);
}
