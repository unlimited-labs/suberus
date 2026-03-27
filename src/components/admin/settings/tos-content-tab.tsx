import { IconFileText, IconLoader2 } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	adminSettingQueryOptions,
	updateTosContentFn,
} from "@/utils/settings.functions";

interface TosContentTabProps {
	initialContent: string;
}

export function TosContentTab({ initialContent }: TosContentTabProps) {
	const queryClient = useQueryClient();
	const [content, setContent] = useState(initialContent);
	const [isSaving, setIsSaving] = useState(false);

	const handleSave = async () => {
		setIsSaving(true);
		try {
			await updateTosContentFn({ data: { content } });
			await queryClient.invalidateQueries({
				queryKey: adminSettingQueryOptions("TOS_CONTENT").queryKey,
			});
			toast.success("Terms of Service saved");
		} catch {
			toast.error("Failed to save Terms of Service");
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="space-y-6">
			<SettingsSection
				icon={IconFileText}
				title="Terms of Service"
				description="Configure Terms of Service content shown during registration (Markdown supported)"
			>
				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="tos-content">Content</Label>
						<Textarea
							id="tos-content"
							value={content}
							onChange={(e) => setContent(e.target.value)}
							rows={15}
							placeholder="# Terms of Service&#10;&#10;Enter terms of service here..."
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
							Save Terms of Service
						</Button>
					</div>
				</div>
			</SettingsSection>
		</div>
	);
}
