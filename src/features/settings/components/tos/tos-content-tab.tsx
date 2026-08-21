import { IconFileText, IconLoader2 } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
	adminSettingQueryOptions,
	updateTosContentFn,
} from "@/features/settings/api/settings";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { getErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Markdown, MarkdownHint } from "@/shared/ui/markdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Textarea } from "@/shared/ui/textarea";

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
		}
		setIsSaving(false);
	};

	return (
		<div className="space-y-6">
			<SettingsSection
				description="Configure Terms of Service content shown during registration (Markdown supported)"
				icon={IconFileText}
				title="Terms of Service"
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
									className="font-mono text-sm"
									id="tos-content"
									onChange={(e) => setContent(e.target.value)}
									placeholder="# Terms of Service&#10;&#10;Enter terms of service here..."
									rows={15}
									value={content}
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
						<MarkdownHint />
					</div>

					<div className="flex justify-end">
						<Button disabled={isSaving} onClick={handleSave}>
							{isSaving && <IconLoader2 className="mr-2 size-4 animate-spin" />}
							Save Terms of Service
						</Button>
					</div>
				</div>
			</SettingsSection>
		</div>
	);
}
