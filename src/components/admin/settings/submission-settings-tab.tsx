import {
	IconBook,
	IconFileText,
	IconLoader2,
	IconUpload,
} from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import { SettingsSection } from "@/components/settings/settings-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { SubmissionValidationSettings } from "@/utils/settings.functions";
import {
	updateReviewGuidelinesFn,
	updateSubmissionGuidelinesFn,
	updateSubmissionValidationSettingsFn,
} from "@/utils/settings.functions";

interface SubmissionSettingsTabProps {
	initialData: SubmissionValidationSettings;
	initialSubmissionGuidelines: string;
	initialReviewGuidelines: string;
}

const submissionGuidelinesPlaceholders = [
	"minTitleLength",
	"maxTitleLength",
	"minAbstractLength",
	"maxAbstractLength",
	"minKeywords",
	"maxKeywords",
];

const fileTypeOptions = [
	{ value: "pdf", label: "PDF" },
	{ value: "docx", label: "DOCX" },
	{ value: "doc", label: "DOC" },
	{ value: "txt", label: "TXT" },
	{ value: "rtf", label: "RTF" },
];

export function SubmissionSettingsTab({
	initialData,
	initialSubmissionGuidelines,
	initialReviewGuidelines,
}: SubmissionSettingsTabProps) {
	const [data, setData] = useState(initialData);
	const [isSaving, setIsSaving] = useState(false);
	const [submissionGuidelines, setSubmissionGuidelines] = useState(
		initialSubmissionGuidelines,
	);
	const [reviewGuidelines, setReviewGuidelines] = useState(
		initialReviewGuidelines,
	);

	const handleChange = <K extends keyof SubmissionValidationSettings>(
		field: K,
		value: SubmissionValidationSettings[K],
	) => {
		setData((prev) => ({ ...prev, [field]: value }));
	};

	const toggleFileType = (type: string) => {
		setData((prev) => ({
			...prev,
			allowedFileTypes: prev.allowedFileTypes.includes(type)
				? prev.allowedFileTypes.filter((t) => t !== type)
				: [...prev.allowedFileTypes, type],
		}));
	};

	const handleSave = async () => {
		setIsSaving(true);
		try {
			await Promise.all([
				updateSubmissionValidationSettingsFn({ data }),
				updateSubmissionGuidelinesFn({
					data: { value: submissionGuidelines },
				}),
				updateReviewGuidelinesFn({
					data: { value: reviewGuidelines },
				}),
			]);
			toast.success("Submission settings saved");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to save settings",
			);
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="space-y-6">
			<SettingsSection
				icon={IconFileText}
				title="Content Validation"
				description="Title, abstract and keyword restrictions"
			>
				<div className="space-y-6">
					{/* Title */}
					<div className="space-y-3">
						<Label className="text-sm font-medium">Title</Label>
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label
									htmlFor="minTitleLength"
									className="text-xs text-muted-foreground"
								>
									Min length (characters)
								</Label>
								<Input
									id="minTitleLength"
									type="number"
									min={1}
									max={500}
									value={data.minTitleLength}
									onChange={(e) =>
										handleChange(
											"minTitleLength",
											parseInt(e.target.value, 10) || 1,
										)
									}
								/>
							</div>
							<div className="space-y-2">
								<Label
									htmlFor="maxTitleLength"
									className="text-xs text-muted-foreground"
								>
									Max length (characters)
								</Label>
								<Input
									id="maxTitleLength"
									type="number"
									min={10}
									max={1000}
									value={data.maxTitleLength}
									onChange={(e) =>
										handleChange(
											"maxTitleLength",
											parseInt(e.target.value, 10) || 200,
										)
									}
								/>
							</div>
						</div>
						{data.minTitleLength > data.maxTitleLength && (
							<p className="text-xs text-destructive">
								Min length cannot exceed max length
							</p>
						)}
					</div>

					<hr className="border-border/50" />

					{/* Abstract */}
					<div className="space-y-3">
						<Label className="text-sm font-medium">Abstract</Label>
						<p className="text-xs text-muted-foreground -mt-2">
							For TEXT format submissions
						</p>
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label
									htmlFor="minAbstractLength"
									className="text-xs text-muted-foreground"
								>
									Min length (characters)
								</Label>
								<Input
									id="minAbstractLength"
									type="number"
									min={0}
									max={10000}
									value={data.minAbstractLength}
									onChange={(e) =>
										handleChange(
											"minAbstractLength",
											parseInt(e.target.value, 10) || 0,
										)
									}
								/>
							</div>
							<div className="space-y-2">
								<Label
									htmlFor="maxAbstractLength"
									className="text-xs text-muted-foreground"
								>
									Max length (characters)
								</Label>
								<Input
									id="maxAbstractLength"
									type="number"
									min={100}
									max={50000}
									value={data.maxAbstractLength}
									onChange={(e) =>
										handleChange(
											"maxAbstractLength",
											parseInt(e.target.value, 10) || 2000,
										)
									}
								/>
							</div>
						</div>
						{data.minAbstractLength > data.maxAbstractLength && (
							<p className="text-xs text-destructive">
								Min length cannot exceed max length
							</p>
						)}
					</div>

					<hr className="border-border/50" />

					{/* Keywords */}
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label htmlFor="enableKeywords">Enable keywords</Label>
								<p className="text-sm text-muted-foreground">
									Authors can add keywords to submissions
								</p>
							</div>
							<Switch
								id="enableKeywords"
								checked={data.enableKeywords}
								onCheckedChange={(checked) =>
									handleChange("enableKeywords", checked)
								}
							/>
						</div>
						{data.enableKeywords && (
							<div className="grid gap-4 sm:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor="minKeywords">Min keywords</Label>
									<Input
										id="minKeywords"
										type="number"
										min={0}
										max={20}
										value={data.minKeywords}
										onChange={(e) =>
											handleChange(
												"minKeywords",
												parseInt(e.target.value, 10) || 0,
											)
										}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="maxKeywords">Max keywords</Label>
									<Input
										id="maxKeywords"
										type="number"
										min={1}
										max={20}
										value={data.maxKeywords}
										onChange={(e) =>
											handleChange(
												"maxKeywords",
												parseInt(e.target.value, 10) || 5,
											)
										}
									/>
								</div>
							</div>
						)}
						{data.enableKeywords && data.minKeywords > data.maxKeywords && (
							<p className="text-xs text-destructive">
								Min keywords cannot exceed max keywords
							</p>
						)}
					</div>
				</div>
			</SettingsSection>

			<SettingsSection
				icon={IconUpload}
				title="Files"
				description="Uploaded file settings"
				delay={50}
			>
				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="maxFileSize">Max file size (MB)</Label>
						<Input
							id="maxFileSize"
							type="number"
							min={1}
							max={100}
							value={data.maxFileSize}
							onChange={(e) =>
								handleChange("maxFileSize", parseInt(e.target.value, 10) || 10)
							}
							className="max-w-32"
						/>
					</div>
					<div className="space-y-2">
						<Label>Allowed file types</Label>
						<div className="flex flex-wrap gap-4">
							{fileTypeOptions.map((type) => (
								<Label
									key={type.value}
									className="flex cursor-pointer items-center gap-2 font-normal"
								>
									<Checkbox
										checked={data.allowedFileTypes.includes(type.value)}
										onCheckedChange={() => toggleFileType(type.value)}
									/>
									<span className="text-sm">{type.label}</span>
								</Label>
							))}
						</div>
					</div>
				</div>
			</SettingsSection>

			<SettingsSection
				icon={IconBook}
				title="Submission Guidelines"
				description="Markdown text shown to authors in the submission form sidebar. Use {{placeholder}} for dynamic values."
				delay={150}
			>
				<div className="space-y-3">
					<div className="flex flex-wrap gap-1.5">
						{submissionGuidelinesPlaceholders.map((p) => (
							<Badge
								key={p}
								variant="secondary"
								className="font-mono text-xs cursor-pointer"
								onClick={() =>
									setSubmissionGuidelines((prev) => `${prev}{{${p}}}`)
								}
							>
								{`{{${p}}}`}
							</Badge>
						))}
					</div>
					<Textarea
						value={submissionGuidelines}
						onChange={(e) => setSubmissionGuidelines(e.target.value)}
						rows={6}
						className="font-mono text-sm"
						placeholder="- Title should be concise..."
					/>
				</div>
			</SettingsSection>

			<SettingsSection
				icon={IconBook}
				title="Review Guidelines"
				description="Markdown text shown to reviewers in the review form sidebar"
				delay={200}
			>
				<Textarea
					value={reviewGuidelines}
					onChange={(e) => setReviewGuidelines(e.target.value)}
					rows={6}
					className="font-mono text-sm"
					placeholder="- Provide constructive feedback..."
				/>
			</SettingsSection>

			<div className="flex justify-end border-t pt-6">
				<Button onClick={handleSave} disabled={isSaving}>
					{isSaving && <IconLoader2 className="mr-2 size-4 animate-spin" />}
					Save All Settings
				</Button>
			</div>
		</div>
	);
}
