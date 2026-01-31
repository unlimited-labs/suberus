import { IconLoader2, IconTags } from "@tabler/icons-react";
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
import type {
	ContentFormat,
	SubmissionTypeConfig,
	SubmissionTypeKey,
} from "@/lib/settings/types";
import { SUBMISSION_TYPE_DISPLAY_NAMES } from "@/lib/settings/types";
import { updateSubmissionTypeConfigFn } from "@/utils/settings.functions";

const reviewModeLabels = {
	OPEN: "Open",
	SINGLE_BLIND: "Single-blind",
	DOUBLE_BLIND: "Double-blind",
} as const;

const FILE_EXTENSIONS = ["pdf", "doc", "docx"] as const;

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
	const [isSaving, setIsSaving] = useState(false);
	const [newCriterion, setNewCriterion] = useState("");

	const displayName = SUBMISSION_TYPE_DISPLAY_NAMES[typeKey];

	const handleChange = <K extends keyof SubmissionTypeConfig>(
		field: K,
		value: SubmissionTypeConfig[K],
	) => {
		onChange({ ...config, [field]: value });
	};

	const toggleExtension = (ext: string) => {
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
		if (newCriterion.trim()) {
			handleChange("scoringCriteria", [
				...config.scoringCriteria,
				newCriterion.trim(),
			]);
			setNewCriterion("");
		}
	};

	const removeCriterion = (index: number) => {
		handleChange(
			"scoringCriteria",
			config.scoringCriteria.filter((_, i) => i !== index),
		);
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
			toast.success(`"${displayName}" settings saved`);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to save settings",
			);
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
							<p className="text-sm text-muted-foreground">
								Type available for selection when submitting
							</p>
						</div>
						<Switch
							checked={config.isActive}
							onCheckedChange={(checked) => handleChange("isActive", checked)}
						/>
					</div>

					{/* Content Format */}
					<div className="space-y-3">
						<div className="space-y-0.5">
							<Label>Content Format</Label>
							<p className="text-sm text-muted-foreground">
								How authors provide their submission content
							</p>
						</div>
						<Select
							value={config.contentFormat}
							onValueChange={(value) =>
								handleChange("contentFormat", value as ContentFormat)
							}
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
									{FILE_EXTENSIONS.map((ext) => (
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
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label>Min reviewers</Label>
							<Input
								type="number"
								min={1}
								max={10}
								value={config.minReviewers}
								onChange={(e) =>
									handleChange(
										"minReviewers",
										parseInt(e.target.value, 10) || 1,
									)
								}
							/>
						</div>
						<div className="space-y-2">
							<Label>Max reviewers</Label>
							<Input
								type="number"
								min={1}
								max={10}
								value={config.maxReviewers}
								onChange={(e) =>
									handleChange(
										"maxReviewers",
										parseInt(e.target.value, 10) || 1,
									)
								}
							/>
						</div>
					</div>

					{/* Review mode */}
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label>Review mode</Label>
							<Select
								value={config.reviewMode}
								onValueChange={(value) =>
									handleChange(
										"reviewMode",
										value as SubmissionTypeConfig["reviewMode"],
									)
								}
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
								<p className="text-sm text-muted-foreground">
									Editor must make the final decision
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

					{/* Revisions */}
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label>Allow revisions</Label>
								<p className="text-sm text-muted-foreground">
									Authors can submit revised versions
								</p>
							</div>
							<Switch
								checked={config.allowRevisions}
								onCheckedChange={(checked) =>
									handleChange("allowRevisions", checked)
								}
							/>
						</div>
						{config.allowRevisions && (
							<div className="space-y-2 pl-0 sm:pl-4">
								<Label>Max revisions</Label>
								<Input
									type="number"
									min={1}
									max={10}
									value={config.maxRevisions}
									onChange={(e) =>
										handleChange(
											"maxRevisions",
											parseInt(e.target.value, 10) || 1,
										)
									}
									className="max-w-32"
								/>
							</div>
						)}
					</div>

					{/* Scoring */}
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label>Enable scoring</Label>
								<p className="text-sm text-muted-foreground">
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
							<div className="space-y-3 pl-0 sm:pl-4">
								<Label>Scoring criteria</Label>
								<div className="flex flex-wrap gap-2">
									{config.scoringCriteria.map((criterion, index) => (
										<Badge
											key={index}
											variant="secondary"
											className="cursor-pointer gap-1 pr-1 hover:bg-destructive/10"
											onClick={() => removeCriterion(index)}
										>
											{criterion}
											<span className="ml-1 text-destructive">×</span>
										</Badge>
									))}
								</div>
								<div className="flex gap-2">
									<Input
										placeholder="Add criterion..."
										value={newCriterion}
										onChange={(e) => setNewCriterion(e.target.value)}
										onKeyDown={(e) => e.key === "Enter" && addCriterion()}
										className="max-w-64"
									/>
									<Button
										type="button"
										variant="outline"
										size="icon"
										onClick={addCriterion}
									>
										<IconTags className="size-4" />
									</Button>
								</div>
							</div>
						)}
					</div>

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
