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
import { bulkEmailCampaignQueryOptions } from "@/features/bulk-email/api/bulk-email";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
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

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconMailForward} title="Email campaigns">
				<Badge
					variant={statusVariant(campaign.status)}
					data-testid="campaign-status"
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

								<div className="space-y-1.5">
									<Label htmlFor="campaign-subject">Subject</Label>
									<Input
										id="campaign-subject"
										data-testid="campaign-subject"
										value={compose.subject}
										onChange={(e) => compose.setSubject(e.target.value)}
										disabled={!compose.isDraft}
									/>
								</div>

								<div className="space-y-1.5">
									<Label htmlFor="campaign-reply-to">Reply-To (optional)</Label>
									<Input
										id="campaign-reply-to"
										type="email"
										placeholder="replies@example.com"
										data-testid="campaign-reply-to"
										value={compose.replyTo}
										onChange={(e) => compose.setReplyTo(e.target.value)}
										disabled={!compose.isDraft}
									/>
								</div>

								<Tabs defaultValue="body">
									<div className="mb-3 flex flex-wrap items-center justify-between gap-3">
										<FormatSelector
											value={compose.format}
											onChange={compose.setFormat}
											disabled={!compose.isDraft}
										/>
										<TabsList>
											<TabsTrigger value="body">Body</TabsTrigger>
											<TabsTrigger value="preview">Preview</TabsTrigger>
										</TabsList>
									</div>

									<TabsContent value="body" className="mt-0">
										<Textarea
											id="campaign-body"
											data-testid="campaign-body"
											value={compose.bodySource}
											onChange={(e) => compose.setBodySource(e.target.value)}
											disabled={!compose.isDraft}
											className="h-[28rem] resize-none font-mono text-sm leading-relaxed"
										/>
									</TabsContent>

									<TabsContent value="preview" className="mt-0">
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
								variant="outlined"
								title="Recipients"
								icon={IconUsers}
							>
								<RecipientSummary
									recipients={campaign.recipients}
									totalRecipients={campaign.totalRecipients}
									sentCount={campaign.sentCount}
									failedCount={campaign.failedCount}
								/>
							</SectionCard>

							<CampaignProgressCard
								campaign={campaign}
								jobId={compose.jobId}
								job={compose.job}
							/>

							<SectionCard
								variant="outlined"
								title="Attachments"
								icon={IconPaperclip}
							>
								<AttachmentDropzone
									campaignId={campaign.id}
									attachments={campaign.attachments}
									disabled={!compose.isDraft}
								/>
							</SectionCard>

							<SectionCard
								variant="outlined"
								title="Placeholders"
								icon={IconBraces}
							>
								<PlaceholderHelp />
							</SectionCard>

							<SectionCard variant="outlined" title="Actions" icon={IconSend}>
								<div className="space-y-3 text-sm">
									{compose.isDraft ? (
										<>
											<Button
												className="w-full"
												data-testid="send-campaign-btn"
												onClick={() => compose.send()}
												disabled={compose.isSending || !compose.canSend}
											>
												<IconSend className="mr-2 size-4" />
												Send campaign
											</Button>
											<div className="grid grid-cols-2 gap-2">
												<Button
													variant="outline"
													data-testid="save-draft-btn"
													onClick={() => compose.save()}
													disabled={compose.isSaving}
												>
													<IconDeviceFloppy className="mr-2 size-4" />
													Save draft
												</Button>
												<Button
													variant="secondary"
													data-testid="test-send-btn"
													onClick={() => compose.sendTest()}
													disabled={compose.isTesting || !compose.canSend}
												>
													<IconFlask className="mr-2 size-4" />
													Send test
												</Button>
											</div>
											<Separator />
											<Button
												variant="ghost"
												className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
												data-testid="delete-campaign-btn"
												onClick={() => compose.remove()}
												disabled={compose.isRemoving}
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
												onClick={() => compose.copy()}
												disabled={compose.isCopying}
											>
												<IconCopy className="mr-2 size-4" />
												Copy to new draft
											</Button>
											<Button
												variant="secondary"
												className="w-full"
												data-testid="test-send-btn"
												onClick={() => compose.sendTest()}
												disabled={compose.isTesting}
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
		</div>
	);
}
