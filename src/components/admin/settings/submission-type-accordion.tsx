import { IconLoader2, IconTags } from "@tabler/icons-react"
import { useState } from "react"
import { toast } from "sonner"

import {
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type {
	ReviewMode,
	SubmissionTypeSettings,
} from "@/lib/mock-data/admin-settings"
import { reviewModeLabels } from "@/lib/mock-data/admin-settings"

interface SubmissionTypeAccordionProps {
	type: SubmissionTypeSettings
	onChange: (updated: SubmissionTypeSettings) => void
}

export function SubmissionTypeAccordion({
	type,
	onChange,
}: SubmissionTypeAccordionProps) {
	const [isSaving, setIsSaving] = useState(false)
	const [newCriterion, setNewCriterion] = useState("")

	const handleChange = <K extends keyof SubmissionTypeSettings>(
		field: K,
		value: SubmissionTypeSettings[K]
	) => {
		onChange({ ...type, [field]: value })
	}

	const addCriterion = () => {
		if (newCriterion.trim()) {
			handleChange("scoringCriteria", [
				...type.scoringCriteria,
				newCriterion.trim(),
			])
			setNewCriterion("")
		}
	}

	const removeCriterion = (index: number) => {
		handleChange(
			"scoringCriteria",
			type.scoringCriteria.filter((_, i) => i !== index)
		)
	}

	const handleSave = async () => {
		setIsSaving(true)
		try {
			await new Promise((resolve) => setTimeout(resolve, 800))
			toast.success(`"${type.name}" settings saved`)
		} finally {
			setIsSaving(false)
		}
	}

	return (
		<AccordionItem
			value={type.id}
			className="rounded-lg border border-border/50 bg-card px-4"
		>
			<AccordionTrigger className="py-4 hover:no-underline">
				<div className="flex items-center gap-3">
					<span className="font-medium">{type.name}</span>
					<Badge variant={type.enabled ? "default" : "secondary"}>
						{type.enabled ? "Active" : "Inactive"}
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
							checked={type.enabled}
							onCheckedChange={(checked) => handleChange("enabled", checked)}
						/>
					</div>

					{/* Reviewers */}
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label>Min reviewers</Label>
							<Input
								type="number"
								min={1}
								max={10}
								value={type.minReviewers}
								onChange={(e) =>
									handleChange("minReviewers", parseInt(e.target.value, 10) || 1)
								}
							/>
						</div>
						<div className="space-y-2">
							<Label>Max reviewers</Label>
							<Input
								type="number"
								min={1}
								max={10}
								value={type.maxReviewers}
								onChange={(e) =>
									handleChange("maxReviewers", parseInt(e.target.value, 10) || 1)
								}
							/>
						</div>
					</div>

					{/* Review mode */}
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label>Review mode</Label>
							<Select
								value={type.reviewMode}
								onValueChange={(value) =>
									handleChange("reviewMode", value as ReviewMode)
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
								value={type.reviewDeadlineDays}
								onChange={(e) =>
									handleChange(
										"reviewDeadlineDays",
										parseInt(e.target.value, 10) || 7
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
								checked={type.requiresEditorDecision}
								onCheckedChange={(checked) =>
									handleChange("requiresEditorDecision", checked)
								}
							/>
						</div>
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label>Auto-transition after reviews</Label>
								<p className="text-sm text-muted-foreground">
									Automatic status change after all reviews complete
								</p>
							</div>
							<Switch
								checked={type.autoTransition}
								onCheckedChange={(checked) =>
									handleChange("autoTransition", checked)
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
								checked={type.allowRevisions}
								onCheckedChange={(checked) =>
									handleChange("allowRevisions", checked)
								}
							/>
						</div>
						{type.allowRevisions && (
							<div className="space-y-2 pl-0 sm:pl-4">
								<Label>Max revisions</Label>
								<Input
									type="number"
									min={1}
									max={10}
									value={type.maxRevisions}
									onChange={(e) =>
										handleChange("maxRevisions", parseInt(e.target.value, 10) || 1)
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
								checked={type.enableScoring}
								onCheckedChange={(checked) =>
									handleChange("enableScoring", checked)
								}
							/>
						</div>
						{type.enableScoring && (
							<div className="space-y-3 pl-0 sm:pl-4">
								<Label>Scoring criteria</Label>
								<div className="flex flex-wrap gap-2">
									{type.scoringCriteria.map((criterion, index) => (
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
							{isSaving && (
								<IconLoader2 className="mr-2 size-4 animate-spin" />
							)}
							Save
						</Button>
					</div>
				</div>
			</AccordionContent>
		</AccordionItem>
	)
}
