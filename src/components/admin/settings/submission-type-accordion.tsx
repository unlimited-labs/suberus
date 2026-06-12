import { IconLoader2, IconPlus, IconTrash } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import {
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { getErrorMessage } from "@/lib/error-message";
import {
	SUPPORTED_FILE_EXTENSIONS,
	type SupportedFileExtension,
} from "@/lib/settings/file-types";
import type {
	ContentFormat,
	SubmissionTypeConfig,
	SubmissionTypeKey,
} from "@/lib/settings/types";
import { SUBMISSION_TYPE_DISPLAY_NAMES } from "@/lib/settings/types";
import {
	submissionTypesConfigQueryOptions,
	updateSubmissionTypeConfigFn,
} from "@/server-fns/settings";

const reviewModeLabels = {
	OPEN: "Open",
	SINGLE_BLIND: "Single-blind",
	DOUBLE_BLIND: "Double-blind",
} as const;

const REVIEW_MODES = Object.keys(
	reviewModeLabels,
) as (keyof typeof reviewModeLabels)[];

const CONTENT_FORMATS = [
	"TEXT",
	"FILE",
] as const satisfies readonly ContentFormat[];

interface ScoringCriteriaSectionProps {
	criteria: SubmissionTypeConfig["scoringCriteria"];
	onUpdate: (
		index: number,
		field: "name" | "description",
		value: string,
	) => void;
	onRemove: (index: number) => void;
	onAdd: () => void;
}

function ScoringCriteriaSection({
	criteria,
	onUpdate,
	onRemove,
	onAdd,
}: ScoringCriteriaSectionProps) {
	return (
		<div className="space-y-3 pl-0 sm:pl-4">
			<Label>Scoring criteria</Label>
			<div className="space-y-2">
				{criteria.map((criterion, index) => (
					<div
						key={`${index}-${criterion.name}`}
						className="flex items-start gap-2"
					>
						<div className="grid flex-1 gap-2 sm:grid-cols-2">
							<Input
								placeholder="Criterion name"
								value={criterion.name}
								onChange={(e) => onUpdate(index, "name", e.target.value)}
							/>
							<Input
								placeholder="Description (optional)"
								value={criterion.description}
								onChange={(e) => onUpdate(index, "description", e.target.value)}
							/>
						</div>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="shrink-0 text-destructive hover:bg-destructive/10"
							onClick={() => onRemove(index)}
						>
							<IconTrash className="size-4" />
						</Button>
					</div>
				))}
			</div>
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={onAdd}
				className="gap-1"
			>
				<IconPlus className="size-4" />
				Add criterion
			</Button>
		</div>
	);
}

interface SubmissionTypeAccordionProps {
	typeKey: SubmissionTypeKey;
	config: SubmissionTypeConfig;
	onChange: (updated: SubmissionTypeConfig) => void;
}

export function SubmissionTypeAccordion({
	typeKey,
	config,
	onChange,
}: SubmissionTypeAccordionProps) {
	const queryClient = useQueryClient();
	const [isSaving, setIsSaving] = useState(false);

	const displayName = SUBMISSION_TYPE_DISPLAY_NAMES[typeKey];

	const handleChange = <K extends keyof SubmissionTypeConfig>(
		field: K,
		value: SubmissionTypeConfig[K],
	) => {
		onChange({ ...config, [field]: value });
	};

	const toggleExtension = (ext: SupportedFileExtension) => {
		const current = config.allowedExtensions;
		if (current.includes(ext)) {
			handleChange(
				"allowedExtensions",
				current.filter((e) => e !== ext),
			);
		} else {
			handleChange("allowedExtensions", [...current, ext]);
		}
	};

	const addCriterion = () => {
		handleChange("scoringCriteria", [
			...config.scoringCriteria,
			{ name: "", description: "" },
		]);
	};

	const removeCriterion = (index: number) => {
		handleChange(
			"scoringCriteria",
			config.scoringCriteria.filter((_, i) => i !== index),
		);
	};

	const updateCriterion = (
		index: number,
		field: "name" | "description",
		value: string,
	) => {
		const updated = config.scoringCriteria.map((c, i) =>
			i === index ? { ...c, [field]: value } : c,
		);
		handleChange("scoringCriteria", updated);
	};

	const handleSave = async () => {
		// Validate FILE format has extensions
		if (
			config.contentFormat === "FILE" &&
			config.allowedExtensions.length === 0
		) {
			toast.error("FILE format requires at least one allowed extension");
			return;
		}

		setIsSaving(true);
		try {
			await updateSubmissionTypeConfigFn({
				data: { type: typeKey, config },
			});
			await queryClient.invalidateQueries({
				queryKey: submissionTypesConfigQueryOptions().queryKey,
			});
			toast.success(`"${displayName}" settings saved`);
		} catch (error) {
			toast.error(getErrorMessage(error, "Failed to save settings"));
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<AccordionItem
			value={typeKey}
			className="rounded-lg border border-border/50 bg-card px-4"
		>
			<AccordionTrigger className="py-4 hover:no-underline">
				<div className="flex items-center gap-3">
					<span className="font-medium">{displayName}</span>
					<Badge variant={config.isActive ? "default" : "secondary"}>
						{config.isActive ? "Active" : "Inactive"}
					</Badge>
					<Badge variant="outline" className="text-xs">
						{config.contentFormat}
					</Badge>
				</div>
			</AccordionTrigger>
			<AccordionContent className="pb-4">
				<div className="space-y-6">
					{/* Basic settings */}
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label>Active</Label>
							<p className="text-xs italic text-muted-foreground/70">
								Type available for selection when submitting
							</p>
						</div>
						<Switch
							checked={config.isActive}
							onCheckedChange={(checked) => handleChange("isActive", checked)}
						/>
					</div>

					{/* Program planner inclusion */}
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label>Include in program planner</Label>
							<p className="text-xs italic text-muted-foreground/70">
								Accepted submissions of this type appear in the program planner
							</p>
						</div>
						<Switch
							data-testid="settings-include-in-planner"
							checked={config.includeInPlanner}
							onCheckedChange={(checked) =>
								handleChange("includeInPlanner", checked)
							}
						/>
					</div>

					{/* Content Format */}
					<div className="space-y-3">
						<div className="space-y-0.5">
							<Label>Content Format</Label>
							<p className="text-xs italic text-muted-foreground/70">
								How authors provide their submission content
							</p>
						</div>
						<Select
							value={config.contentFormat}
							onValueChange={(value) => {
								const found = CONTENT_FORMATS.find((f) => f === value);
								if (found) handleChange("contentFormat", found);
							}}
						>
							<SelectTrigger className="max-w-64">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="TEXT">Text (Abstract)</SelectItem>
								<SelectItem value="FILE">File Upload</SelectItem>
							</SelectContent>
						</Select>

						{/* File extensions (only for FILE format) */}
						{config.contentFormat === "FILE" && (
							<div className="space-y-2 pl-0 sm:pl-4 pt-2">
								<Label className="text-sm">Allowed file extensions</Label>
								<div className="flex flex-wrap gap-3">
									{SUPPORTED_FILE_EXTENSIONS.map((ext) => (
										<div
											key={ext}
											className="flex items-center gap-2 cursor-pointer"
										>
											<Checkbox
												id={`ext-${ext}`}
												checked={config.allowedExtensions.includes(ext)}
												onCheckedChange={() => toggleExtension(ext)}
											/>
											<Label
												htmlFor={`ext-${ext}`}
												className="text-sm uppercase cursor-pointer"
											>
												{ext}
											</Label>
										</div>
									))}
								</div>
								{config.allowedExtensions.length === 0 && (
									<p className="text-xs text-destructive">
										At least one extension is required
									</p>
								)}
							</div>
						)}
					</div>

					{/* Reviewers */}
					<div className="space-y-2">
						<Label>Required reviewers</Label>
						<Input
							type="number"
							min={1}
							max={10}
							value={config.requiredReviewers}
							onChange={(e) =>
								handleChange(
									"requiredReviewers",
									parseInt(e.target.value, 10) || 1,
								)
							}
						/>
					</div>

					{/* Review mode */}
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label>Review mode</Label>
							<Select
								value={config.reviewMode}
								onValueChange={(value) => {
									const found = REVIEW_MODES.find((m) => m === value);
									if (found) handleChange("reviewMode", found);
								}}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{Object.entries(reviewModeLabels).map(([value, label]) => (
										<SelectItem key={value} value={value}>
											{label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>Review deadline (days)</Label>
							<Input
								type="number"
								min={1}
								max={90}
								value={config.reviewDeadlineDays}
								onChange={(e) =>
									handleChange(
										"reviewDeadlineDays",
										parseInt(e.target.value, 10) || 7,
									)
								}
							/>
						</div>
					</div>

					{/* Decision settings */}
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label>Requires editor decision</Label>
								<p className="text-xs italic text-muted-foreground/70">
									Editor makes the final accept/reject decision. When off, the
									reviewer's recommendation is applied automatically.
								</p>
							</div>
							<Switch
								checked={config.requiresEditorDecision}
								onCheckedChange={(checked) =>
									handleChange("requiresEditorDecision", checked)
								}
							/>
						</div>
					</div>

					{/* Scoring */}
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label>Enable scoring</Label>
								<p className="text-xs italic text-muted-foreground/70">
									Reviewers score based on criteria
								</p>
							</div>
							<Switch
								checked={config.enableScoring}
								onCheckedChange={(checked) =>
									handleChange("enableScoring", checked)
								}
							/>
						</div>
						{config.enableScoring && (
							<ScoringCriteriaSection
								criteria={config.scoringCriteria}
								onUpdate={updateCriterion}
								onRemove={removeCriterion}
								onAdd={addCriterion}
							/>
						)}
					</div>

					{/* Confidence Level */}
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label htmlFor="enableConfidenceLevel">
								Enable confidence level
							</Label>
							<p className="text-xs italic text-muted-foreground/70">
								Reviewers rate their confidence (1-5) when submitting a review
							</p>
						</div>
						<Switch
							id="enableConfidenceLevel"
							checked={config.enableConfidenceLevel}
							onCheckedChange={(checked) =>
								handleChange("enableConfidenceLevel", checked)
							}
						/>
					</div>

					{/* Review Attachment */}
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label htmlFor="enableReviewAttachment">
								Enable review attachment
							</Label>
							<p className="text-xs italic text-muted-foreground/70">
								Reviewers can upload a PDF/DOCX file with their review
							</p>
						</div>
						<Switch
							id="enableReviewAttachment"
							checked={config.enableReviewAttachment}
							onCheckedChange={(checked) =>
								handleChange("enableReviewAttachment", checked)
							}
						/>
					</div>

					{/* Track Selection (Oral Presentation only) */}
					{typeKey === "SUBMISSION_TYPE_ORAL_PRESENTATION" && (
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label>Enable track selection</Label>
								<p className="text-xs italic text-muted-foreground/70">
									Authors can select preferred track when submitting
								</p>
							</div>
							<Switch
								checked={config.enableTrackSelection}
								onCheckedChange={(checked) =>
									handleChange("enableTrackSelection", checked)
								}
							/>
						</div>
					)}

					{/* Save button */}
					<div className="flex justify-end border-t pt-4">
						<Button onClick={handleSave} disabled={isSaving}>
							{isSaving && <IconLoader2 className="mr-2 size-4 animate-spin" />}
							Save
						</Button>
					</div>
				</div>
			</AccordionContent>
		</AccordionItem>
	);
}
