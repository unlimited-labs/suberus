import { IconFileText, IconLoader2 } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Markdown } from "@/components/ui/markdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/error-message";
import {
	adminSettingQueryOptions,
	updateTosContentFn,
} from "@/server-fns/settings";

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
		} catch (error) {
			toast.error(getErrorMessage(error, "Failed to save Terms of Service"));
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
						<Tabs defaultValue="edit">
							<TabsList>
								<TabsTrigger value="edit">Edit</TabsTrigger>
								<TabsTrigger value="preview">Preview</TabsTrigger>
							</TabsList>
							<TabsContent value="edit">
								<Textarea
									id="tos-content"
									value={content}
									onChange={(e) => setContent(e.target.value)}
									rows={15}
									placeholder="# Terms of Service&#10;&#10;Enter terms of service here..."
									className="font-mono text-sm"
								/>
							</TabsContent>
							<TabsContent value="preview">
								<div className="min-h-[22rem] rounded-md border p-4">
									{content.trim() ? (
										<Markdown content={content} />
									) : (
										<p className="text-sm text-muted-foreground">
											Nothing to preview yet
										</p>
									)}
								</div>
							</TabsContent>
						</Tabs>
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
