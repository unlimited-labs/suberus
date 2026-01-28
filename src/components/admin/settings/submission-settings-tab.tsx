import { useState } from "react"
import { toast } from "sonner"
import {
	IconFileText,
	IconUpload,
	IconSettings,
	IconLoader2,
} from "@tabler/icons-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { SettingsSection } from "@/components/settings/settings-section"
import type { SubmissionSettings } from "@/lib/mock-data/admin-settings"

interface SubmissionSettingsTabProps {
	initialData: SubmissionSettings
}

const fileTypeOptions = [
	{ value: "pdf", label: "PDF" },
	{ value: "docx", label: "DOCX" },
	{ value: "doc", label: "DOC" },
	{ value: "txt", label: "TXT" },
	{ value: "rtf", label: "RTF" },
]

export function SubmissionSettingsTab({
	initialData,
}: SubmissionSettingsTabProps) {
	const [data, setData] = useState(initialData)
	const [isSaving, setIsSaving] = useState(false)

	const handleChange = <K extends keyof SubmissionSettings>(
		field: K,
		value: SubmissionSettings[K]
	) => {
		setData((prev) => ({ ...prev, [field]: value }))
	}

	const toggleFileType = (type: string) => {
		setData((prev) => ({
			...prev,
			allowedFileTypes: prev.allowedFileTypes.includes(type)
				? prev.allowedFileTypes.filter((t) => t !== type)
				: [...prev.allowedFileTypes, type],
		}))
	}

	const handleSave = async () => {
		setIsSaving(true)
		try {
			await new Promise((resolve) => setTimeout(resolve, 800))
			toast.success("Submission settings saved")
		} finally {
			setIsSaving(false)
		}
	}

	return (
		<div className="space-y-6">
			<SettingsSection
				icon={IconFileText}
				title="Limits"
				description="Restrictions for authors"
			>
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="maxAbstractLength">
							Max abstract length (words)
						</Label>
						<Input
							id="maxAbstractLength"
							type="number"
							min={100}
							max={10000}
							value={data.maxAbstractLength}
							onChange={(e) =>
								handleChange("maxAbstractLength", parseInt(e.target.value, 10) || 0)
							}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="maxAuthors">Max number of authors</Label>
						<Input
							id="maxAuthors"
							type="number"
							min={1}
							max={50}
							value={data.maxAuthors}
							onChange={(e) =>
								handleChange("maxAuthors", parseInt(e.target.value, 10) || 1)
							}
						/>
					</div>
				</div>
				<div className="mt-6 flex justify-end">
					<Button onClick={handleSave} disabled={isSaving}>
						{isSaving && <IconLoader2 className="mr-2 size-4 animate-spin" />}
						Save
					</Button>
				</div>
			</SettingsSection>

			<SettingsSection
				icon={IconUpload}
				title="Files"
				description="Uploaded file settings"
				delay={100}
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
								handleChange("maxFileSize", parseInt(e.target.value, 10) || 1)
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
				<div className="mt-6 flex justify-end">
					<Button onClick={handleSave} disabled={isSaving}>
						{isSaving && <IconLoader2 className="mr-2 size-4 animate-spin" />}
						Save
					</Button>
				</div>
			</SettingsSection>

			<SettingsSection
				icon={IconSettings}
				title="Options"
				description="Additional submission options"
				delay={200}
			>
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label htmlFor="requireOrcid">Require ORCID</Label>
							<p className="text-sm text-muted-foreground">
								Authors must provide an ORCID identifier
							</p>
						</div>
						<Switch
							id="requireOrcid"
							checked={data.requireOrcid}
							onCheckedChange={(checked) => handleChange("requireOrcid", checked)}
						/>
					</div>
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
						<div className="space-y-2 pl-0 sm:pl-4">
							<Label htmlFor="maxKeywords">Max keywords</Label>
							<Input
								id="maxKeywords"
								type="number"
								min={1}
								max={20}
								value={data.maxKeywords}
								onChange={(e) =>
									handleChange("maxKeywords", parseInt(e.target.value, 10) || 1)
								}
								className="max-w-32"
							/>
						</div>
					)}
				</div>
				<div className="mt-6 flex justify-end">
					<Button onClick={handleSave} disabled={isSaving}>
						{isSaving && <IconLoader2 className="mr-2 size-4 animate-spin" />}
						Save
					</Button>
				</div>
			</SettingsSection>
		</div>
	)
}
