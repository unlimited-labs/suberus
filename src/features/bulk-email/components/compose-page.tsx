import {
	IconBraces,
	IconCopy,
	IconDeviceFloppy,
	IconFlask,
	IconMailForward,
	IconPaperclip,
	IconSend,
	IconTrash,
	IconUsers,
} from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { bulkEmailCampaignQueryOptions } from "@/features/bulk-email/api/bulk-email";
import { PageHeader } from "@/shared/components/layout/page-header";
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
import { SectionCard } from "@/shared/ui/section-card";
import { Separator } from "@/shared/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Textarea } from "@/shared/ui/textarea";
import { AttachmentDropzone } from "./attachment-dropzone";
import { CampaignProgressCard } from "./campaign-progress-card";
import { FormatSelector } from "./format-selector";
import { PlaceholderHelp } from "./placeholder-help";
import { PreviewIframe } from "./preview-iframe";
import { RecipientSummary } from "./recipient-summary";
import { useComposeCampaign } from "./use-compose-campaign";

interface ComposePageProps {
	campaignId: string;
}

function statusVariant(
	status: string,
): "default" | "secondary" | "destructive" {
	if (status === "FAILED") return "destructive";
	if (status === "DRAFT") return "secondary";
	return "default";
}

export function ComposePage({ campaignId }: ComposePageProps) {
	const { data: campaign } = useSuspenseQuery(
		bulkEmailCampaignQueryOptions(campaignId),
	);
	const compose = useComposeCampaign(campaign);
	const [confirmOpen, setConfirmOpen] = useState(false);

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconMailForward} title="Email campaigns">
				<Badge
					data-testid="campaign-status"
					variant={statusVariant(campaign.status)}
				>
					{campaign.status}
				</Badge>
			</PageHeader>

			<div className="flex-1 overflow-auto p-6">
				<div className="mx-auto w-full max-w-7xl">
					<div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
						<div className="rounded-2xl bg-card overflow-hidden shadow-2xl">
							<div className="space-y-6 p-6 sm:p-8">
								<div>
									<h1 className="text-2xl font-semibold tracking-tight">
										Compose
									</h1>
									<p className="mt-1 text-sm text-muted-foreground">
										Write your message and preview it before sending.
									</p>
								</div>

								<div className="border-t" />

								<compose.form.AppField name="subject">
									{(field) => (
										<field.InputField
											disabled={!compose.isDraft}
											label="Subject"
											testId="campaign-subject"
										/>
									)}
								</compose.form.AppField>

								<compose.form.AppField name="replyTo">
									{(field) => (
										<field.InputField
											disabled={!compose.isDraft}
											label="Reply-To (optional)"
											placeholder="replies@example.com"
											testId="campaign-reply-to"
											type="email"
										/>
									)}
								</compose.form.AppField>

								<Tabs defaultValue="body">
									<div className="mb-3 flex flex-wrap items-center justify-between gap-3">
										<compose.form.Field name="format">
											{(field) => (
												<FormatSelector
													disabled={!compose.isDraft}
													onChange={field.handleChange}
													value={field.state.value}
												/>
											)}
										</compose.form.Field>
										<TabsList>
											<TabsTrigger value="body">Body</TabsTrigger>
											<TabsTrigger value="preview">Preview</TabsTrigger>
										</TabsList>
									</div>

									<TabsContent className="mt-0" value="body">
										<compose.form.AppField name="bodySource">
											{(field) => (
												<Textarea
													className="h-[28rem] resize-none font-mono text-sm leading-relaxed"
													data-testid="campaign-body"
													disabled={!compose.isDraft}
													id="campaign-body"
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
													value={field.state.value}
												/>
											)}
										</compose.form.AppField>
									</TabsContent>

									<TabsContent className="mt-0" value="preview">
										<PreviewIframe
											body={compose.preview.body}
											isHtml={compose.preview.isHtml}
											isLoading={compose.isPreviewLoading}
										/>
									</TabsContent>
								</Tabs>
							</div>
						</div>

						<aside className="space-y-4 lg:sticky lg:top-0 lg:self-start">
							<SectionCard
								icon={IconUsers}
								title="Recipients"
								variant="outlined"
							>
								<RecipientSummary
									failedCount={campaign.failedCount}
									recipients={campaign.recipients}
									sentCount={campaign.sentCount}
									totalRecipients={campaign.totalRecipients}
								/>
							</SectionCard>

							<CampaignProgressCard
								campaign={campaign}
								job={compose.job}
								jobId={compose.jobId}
							/>

							<SectionCard
								icon={IconPaperclip}
								title="Attachments"
								variant="outlined"
							>
								<AttachmentDropzone
									attachments={campaign.attachments}
									campaignId={campaign.id}
									disabled={!compose.isDraft}
								/>
							</SectionCard>

							<SectionCard
								icon={IconBraces}
								title="Placeholders"
								variant="outlined"
							>
								<PlaceholderHelp />
							</SectionCard>

							<SectionCard icon={IconSend} title="Actions" variant="outlined">
								<div className="space-y-3 text-sm">
									{compose.isDraft ? (
										<>
											<Button
												className="w-full"
												data-testid="send-campaign-btn"
												disabled={compose.isSending || !compose.canSend}
												onClick={() => setConfirmOpen(true)}
											>
												<IconSend className="mr-2 size-4" />
												Send campaign
											</Button>
											<div className="grid grid-cols-2 gap-2">
												<Button
													data-testid="save-draft-btn"
													disabled={compose.isSaving}
													onClick={() => compose.save()}
													variant="outline"
												>
													<IconDeviceFloppy className="mr-2 size-4" />
													Save draft
												</Button>
												<Button
													data-testid="test-send-btn"
													disabled={compose.isTesting || !compose.canSend}
													onClick={() => compose.sendTest()}
													variant="secondary"
												>
													<IconFlask className="mr-2 size-4" />
													Send test
												</Button>
											</div>
											<Separator />
											<Button
												className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
												data-testid="delete-campaign-btn"
												disabled={compose.isRemoving}
												onClick={() => compose.remove()}
												variant="ghost"
											>
												<IconTrash className="mr-2 size-4" />
												Delete draft
											</Button>
										</>
									) : (
										<>
											<Button
												className="w-full"
												data-testid="copy-campaign-btn"
												disabled={compose.isCopying}
												onClick={() => compose.copy()}
											>
												<IconCopy className="mr-2 size-4" />
												Copy to new draft
											</Button>
											<Button
												className="w-full"
												data-testid="test-send-btn"
												disabled={compose.isTesting}
												onClick={() => compose.sendTest()}
												variant="secondary"
											>
												<IconFlask className="mr-2 size-4" />
												Send test
											</Button>
										</>
									)}
								</div>
							</SectionCard>
						</aside>
					</div>
				</div>
			</div>

			<Dialog onOpenChange={setConfirmOpen} open={confirmOpen}>
				<DialogContent data-testid="confirm-send-campaign-dialog">
					<DialogHeader>
						<DialogTitle>Send campaign?</DialogTitle>
						<DialogDescription>
							This will send the message to {campaign.totalRecipients}{" "}
							{campaign.totalRecipients === 1 ? "recipient" : "recipients"}.
							Once started, the send cannot be stopped. You can close this
							browser — delivery continues on the server.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							onClick={() => setConfirmOpen(false)}
							type="button"
							variant="outline"
						>
							Cancel
						</Button>
						<Button
							data-testid="confirm-send-campaign-btn"
							disabled={compose.isSending}
							onClick={() => {
								setConfirmOpen(false);
								compose.send();
							}}
							type="button"
						>
							<IconSend className="mr-2 size-4" />
							Send campaign
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
