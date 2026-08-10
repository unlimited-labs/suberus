import { IconLoader2, IconMail, IconSignature } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
	emailFooterQueryOptions,
	updateEmailFooterFn,
} from "@/features/settings/api/settings";
import { SettingsSection } from "@/features/settings/components/settings-section";
import type { EmailEventType } from "@/generated/prisma/enums";
import { getErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { EmailTemplateCard } from "./email-template-card";
import { EmailTemplateDialog } from "./email-template-dialog";

/** UI shape for email templates (maps Prisma arrays to comma-separated strings) */
export interface EmailTemplateUI {
	id: string;
	eventType: EmailEventType;
	name: string;
	subject: string;
	body: string;
	cc: string;
	bcc: string;
	isEnabled: boolean;
	placeholders: string[];
}

/** Human-readable labels for EmailEventType */
const eventTypeLabels: Record<EmailEventType, string> = {
	SUBMISSION_RECEIVED: "Submission Received",
	SUBMISSION_WITHDRAWN: "Submission Withdrawn",
	REVIEWER_ASSIGNED: "Reviewer Assigned",
	REVIEWER_REMINDER: "Reviewer Reminder",
	REVIEW_SUBMITTED: "Review Submitted",
	ALL_REVIEWS_COMPLETE: "All Reviews Complete",
	DECISION_ACCEPTED: "Decision - Accepted",
	DECISION_CONDITIONALLY_ACCEPTED: "Decision - Conditionally Accepted",
	DECISION_REVISE_REQUIRED: "Decision - Revision Required",
	DECISION_REJECTED: "Decision - Rejected",
	REVISION_REMINDER: "Revision Reminder",
	REVISION_RECEIVED: "Revision Received",
	DEADLINE_APPROACHING: "Deadline Approaching",
	ACCOUNT_CREATED: "Account Created",
	ACCOUNT_CREATED_BY_ADMIN: "Account Created by Organizer",
	PASSWORD_RESET: "Password Reset",
	EMAIL_VERIFICATION: "Email Verification",
	INVITATION: "Invitation",
	DECISION_OVERRIDDEN: "Decision Overridden",
	NEW_REGISTRATION_NOTIFY: "New Registration (Admin)",
	NEW_SUBMISSION_NOTIFY: "New Submission (Admin)",
	EXHIBITOR_APPROVED: "Exhibitor Approved",
	EXHIBITOR_REJECTED: "Exhibitor Rejected",
	DOCUMENT_GENERATED: "Document Generated",
};

/** Map Prisma EmailTemplate to UI shape */
export function toEmailTemplateUI(t: {
	id: string;
	eventType: EmailEventType;
	subject: string;
	body: string;
	ccEmails: string[];
	bccEmails: string[];
	isEnabled: boolean;
	availablePlaceholders: string[];
	description: string | null;
}): EmailTemplateUI {
	return {
		id: t.id,
		eventType: t.eventType,
		name: t.description ?? eventTypeLabels[t.eventType] ?? t.eventType,
		subject: t.subject,
		body: t.body,
		cc: t.ccEmails.join(", "),
		bcc: t.bccEmails.join(", "),
		isEnabled: t.isEnabled,
		placeholders: t.availablePlaceholders,
	};
}

interface EmailTemplatesTabProps {
	initialData: EmailTemplateUI[];
	initialFooter?: string;
}

export function EmailTemplatesTab({
	initialData,
	initialFooter,
}: EmailTemplatesTabProps) {
	const queryClient = useQueryClient();
	const [templates, setTemplates] = useState(initialData);
	const [editingTemplate, setEditingTemplate] =
		useState<EmailTemplateUI | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [footer, setFooter] = useState(initialFooter ?? "");
	const [isSavingFooter, setIsSavingFooter] = useState(false);

	const handleEdit = (template: EmailTemplateUI) => {
		setEditingTemplate(template);
		setDialogOpen(true);
	};

	const handleSave = (updated: EmailTemplateUI) => {
		setTemplates((prev) =>
			prev.map((t) => (t.eventType === updated.eventType ? updated : t)),
		);
	};

	const handleSaveFooter = async () => {
		setIsSavingFooter(true);
		try {
			await updateEmailFooterFn({ data: { value: footer } });
			await queryClient.invalidateQueries({
				queryKey: emailFooterQueryOptions().queryKey,
			});
			toast.success("Email footer saved");
		} catch (error) {
			toast.error(getErrorMessage(error, "Failed to save footer"));
		}
		setIsSavingFooter(false);
	};

	return (
		<>
			<SettingsSection
				icon={IconSignature}
				title="Email Signature / Footer"
				description="This text is appended to all outgoing emails"
			>
				<div className="space-y-3">
					<div className="space-y-2">
						<Label htmlFor="emailFooter">Footer text</Label>
						<Textarea
							id="emailFooter"
							value={footer}
							onChange={(e) => setFooter(e.target.value)}
							rows={4}
							placeholder="Best regards,&#10;Conference Committee"
							className="text-sm"
						/>
						<p className="text-xs text-muted-foreground">
							Leave empty to disable. Appended to all outgoing emails. Use{" "}
							<code className="rounded bg-muted px-1">
								{"{{conferenceName}}"}
							</code>{" "}
							to insert the conference name.
						</p>
					</div>
					<div className="flex justify-end">
						<Button
							onClick={handleSaveFooter}
							disabled={isSavingFooter}
							size="sm"
						>
							{isSavingFooter && (
								<IconLoader2 className="mr-2 size-4 animate-spin" />
							)}
							Save Footer
						</Button>
					</div>
				</div>
			</SettingsSection>

			<div className="mt-6" />

			<SettingsSection
				icon={IconMail}
				title="Email Templates"
				description="Manage email notification templates"
			>
				<div className="space-y-3">
					{templates.map((template) => (
						<EmailTemplateCard
							key={template.eventType}
							template={template}
							onEdit={() => handleEdit(template)}
						/>
					))}
				</div>
			</SettingsSection>

			<EmailTemplateDialog
				key={editingTemplate?.eventType ?? "none"}
				template={editingTemplate}
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				onSave={handleSave}
			/>
		</>
	);
}
