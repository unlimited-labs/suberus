import { IconCash, IconLoader2 } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateFeeInstructionsFn } from "@/utils/settings.functions";

interface FeeInstructionsTabProps {
	initialInstructions: string;
}

export function FeeInstructionsTab({
	initialInstructions,
}: FeeInstructionsTabProps) {
	const [content, setContent] = useState(initialInstructions);
	const [isSaving, setIsSaving] = useState(false);

	const handleSave = async () => {
		setIsSaving(true);
		try {
			await updateFeeInstructionsFn({ data: { content } });
			toast.success("Fee payment instructions saved");
		} catch (error) {
			toast.error("Failed to save fee instructions");
			console.error("Failed to save fee instructions:", error);
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="space-y-6">
			<SettingsSection
				icon={IconCash}
				title="Payment Instructions"
				description="Configure payment information displayed to users (Markdown supported)"
			>
				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="instructions">Instructions Content</Label>
						<Textarea
							id="instructions"
							value={content}
							onChange={(e) => setContent(e.target.value)}
							rows={15}
							placeholder="# Payment Instructions&#10;&#10;Enter payment details here..."
							className="font-mono text-sm"
						/>
						<p className="text-xs text-muted-foreground">
							Supports Markdown formatting (headings, lists, links, bold,
							italic)
						</p>
					</div>

					<div className="flex justify-end">
						<Button onClick={handleSave} disabled={isSaving}>
							{isSaving && <IconLoader2 className="mr-2 size-4 animate-spin" />}
							Save Instructions
						</Button>
					</div>
				</div>
			</SettingsSection>
		</div>
	);
}
