import { IconLoader2, IconSend } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
	emailTemplatesQueryOptions,
	sendTestEmailFn,
	updateEmailTemplateFn,
} from "@/features/email-templates/api/email-templates";
import { getErrorMessage } from "@/shared/lib/error-message";
import { lookup } from "@/shared/lib/lookup";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import { Textarea } from "@/shared/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import type { EmailTemplateUI } from "./email-templates-tab";

const PLACEHOLDER_DESCRIPTIONS = {
	authorName: "Author's full name",
	submissionTitle: "Title of the submission",
	submissionUrl: "Link to view the submission",
	firstName: "User's first name",
	verificationUrl: "Email verification link",
	conferenceName: "Name of the conference",
	resetUrl: "Password reset link",
	reviewerName: "Reviewer's full name",
	deadline: "Review/revision deadline date",
	reviewUrl: "Link to review the submission",
	letterToAuthor: "Editor's decision letter text",
	versionNumber: "Revision version number",
	recipientName: "Recipient's name",
	roleName: "Assigned role name",
	registrationUrl: "Registration link",
	expiresAt: "Invitation expiration date",
} satisfies Record<string, string>;

interface EmailTemplateDialogProps {
	template: EmailTemplateUI | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: (template: EmailTemplateUI) => void;
}

export function EmailTemplateDialog({
	template,
	open,
	onOpenChange,
	onSave,
}: EmailTemplateDialogProps) {
	const queryClient = useQueryClient();
	const [data, setData] = useState<EmailTemplateUI | null>(template);
	const [isSaving, setIsSaving] = useState(false);
	const [isSendingTest, setIsSendingTest] = useState(false);

	if (!data) return null;

	const handleChange = <K extends keyof EmailTemplateUI>(
		field: K,
		value: EmailTemplateUI[K],
	) => {
		setData((prev) => (prev ? { ...prev, [field]: value } : prev));
	};

	const handleSave = async () => {
		if (!data) return;
		setIsSaving(true);
		try {
			await updateEmailTemplateFn({
				data: {
					eventType: data.eventType,
					subject: data.subject,
					body: data.body,
					ccEmails: data.cc.split(",").flatMap((e) => {
						const trimmed = e.trim();
						return trimmed ? [trimmed] : [];
					}),
					bccEmails: data.bcc.split(",").flatMap((e) => {
						const trimmed = e.trim();
						return trimmed ? [trimmed] : [];
					}),
					isEnabled: data.isEnabled,
				},
			});
			await queryClient.invalidateQueries({
				queryKey: emailTemplatesQueryOptions().queryKey,
			});
			onSave(data);
			toast.success(`Template "${data.name}" saved`);
			onOpenChange(false);
		} catch (error) {
			toast.error(getErrorMessage(error, "Failed to save template"));
		}
		setIsSaving(false);
	};

	const handleSendTest = async () => {
		if (!data) return;
		setIsSendingTest(true);
		try {
			await sendTestEmailFn({
				data: {
					subject: data.subject,
					body: data.body,
					isHtml: false,
				},
			});
			toast.success("Test email sent — check your inbox");
		} catch (err) {
			toast.error(
				`Failed to send test email: ${getErrorMessage(err, "Unknown error")}`,
			);
		}
		setIsSendingTest(false);
	};

	const busy = isSaving || isSendingTest;

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Edit template: {data.name}</DialogTitle>
					<DialogDescription>
						Modify email template content and settings
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<div className="flex items-center justify-between">
						<Label htmlFor="enabled">Active</Label>
						<Switch
							checked={data.isEnabled}
							id="enabled"
							onCheckedChange={(checked) => handleChange("isEnabled", checked)}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="subject">Subject</Label>
						<Input
							id="subject"
							onChange={(e) => handleChange("subject", e.target.value)}
							value={data.subject}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="body">Body</Label>
						<Textarea
							className="min-h-48"
							id="body"
							onChange={(e) => handleChange("body", e.target.value)}
							value={data.body}
						/>
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="cc">CC</Label>
							<Input
								id="cc"
								onChange={(e) => handleChange("cc", e.target.value)}
								placeholder="email@example.com"
								value={data.cc}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="bcc">BCC</Label>
							<Input
								id="bcc"
								onChange={(e) => handleChange("bcc", e.target.value)}
								placeholder="email@example.com"
								value={data.bcc}
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label>Available placeholders</Label>
						<div className="flex flex-wrap gap-1.5">
							{data.placeholders.map((placeholder) => {
								const description =
									lookup(PLACEHOLDER_DESCRIPTIONS, placeholder) ?? placeholder;
								return (
									<Tooltip key={placeholder}>
										<TooltipTrigger asChild>
											<Badge
												className="cursor-pointer font-mono text-xs"
												onClick={() => {
													navigator.clipboard.writeText(placeholder);
													toast.success("Copied to clipboard");
												}}
												variant="outline"
											>
												{placeholder}
											</Badge>
										</TooltipTrigger>
										<TooltipContent>{description}</TooltipContent>
									</Tooltip>
								);
							})}
						</div>
						<p className="text-xs text-muted-foreground">
							Click to copy &middot; hover for description
						</p>
					</div>
				</div>

				<DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
					<Button disabled={busy} onClick={handleSendTest} variant="secondary">
						{isSendingTest ? (
							<IconLoader2 className="mr-2 size-4 animate-spin" />
						) : (
							<IconSend className="mr-2 size-4" />
						)}
						Send Test
					</Button>
					<div className="flex gap-2">
						<Button
							disabled={busy}
							onClick={() => onOpenChange(false)}
							variant="outline"
						>
							Cancel
						</Button>
						<Button disabled={busy} onClick={handleSave}>
							{isSaving && <IconLoader2 className="mr-2 size-4 animate-spin" />}
							Save
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
