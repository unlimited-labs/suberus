import { IconLoader2, IconSend } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { EmailEventType } from "@/generated/prisma/enums";
import {
	sendTestEmailFn,
	updateEmailTemplateFn,
} from "@/utils/email-templates.functions";
import type { EmailTemplateUI } from "./email-templates-tab";

const PLACEHOLDER_DESCRIPTIONS: Record<string, string> = {
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
};

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
	const [data, setData] = useState<EmailTemplateUI | null>(template);
	const [isSaving, setIsSaving] = useState(false);
	const [isSendingTest, setIsSendingTest] = useState(false);

	// Update local state when template changes
	if (template && data?.eventType !== template.eventType) {
		setData(template);
	}

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
					eventType: data.eventType as EmailEventType,
					subject: data.subject,
					body: data.body,
					ccEmails: data.cc
						.split(",")
						.map((e) => e.trim())
						.filter(Boolean),
					bccEmails: data.bcc
						.split(",")
						.map((e) => e.trim())
						.filter(Boolean),
					isEnabled: data.isEnabled,
				},
			});
			onSave(data);
			toast.success(`Template "${data.name}" saved`);
			onOpenChange(false);
		} catch {
			toast.error("Failed to save template");
		} finally {
			setIsSaving(false);
		}
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
			const message = err instanceof Error ? err.message : "Unknown error";
			toast.error(`Failed to send test email: ${message}`);
		} finally {
			setIsSendingTest(false);
		}
	};

	const busy = isSaving || isSendingTest;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
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
							id="enabled"
							checked={data.isEnabled}
							onCheckedChange={(checked) => handleChange("isEnabled", checked)}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="subject">Subject</Label>
						<Input
							id="subject"
							value={data.subject}
							onChange={(e) => handleChange("subject", e.target.value)}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="body">Body</Label>
						<Textarea
							id="body"
							value={data.body}
							onChange={(e) => handleChange("body", e.target.value)}
							className="min-h-48"
						/>
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="cc">CC</Label>
							<Input
								id="cc"
								value={data.cc}
								onChange={(e) => handleChange("cc", e.target.value)}
								placeholder="email@example.com"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="bcc">BCC</Label>
							<Input
								id="bcc"
								value={data.bcc}
								onChange={(e) => handleChange("bcc", e.target.value)}
								placeholder="email@example.com"
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label>Available placeholders</Label>
						<div className="flex flex-wrap gap-1.5">
							{data.placeholders.map((placeholder) => {
								const description =
									PLACEHOLDER_DESCRIPTIONS[placeholder] ?? placeholder;
								return (
									<Tooltip key={placeholder}>
										<TooltipTrigger asChild>
											<Badge
												variant="outline"
												className="cursor-pointer font-mono text-xs"
												onClick={() => {
													navigator.clipboard.writeText(placeholder);
													toast.success("Copied to clipboard");
												}}
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
					<Button variant="secondary" onClick={handleSendTest} disabled={busy}>
						{isSendingTest ? (
							<IconLoader2 className="mr-2 size-4 animate-spin" />
						) : (
							<IconSend className="mr-2 size-4" />
						)}
						Send Test
					</Button>
					<div className="flex gap-2">
						<Button
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={busy}
						>
							Cancel
						</Button>
						<Button onClick={handleSave} disabled={busy}>
							{isSaving && <IconLoader2 className="mr-2 size-4 animate-spin" />}
							Save
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
