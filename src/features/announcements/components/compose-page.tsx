import {
	IconBraces,
	IconDeviceFloppy,
	IconSend,
	IconSpeakerphone,
	IconTrash,
	IconUsers,
} from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { announcementQueryOptions } from "@/features/announcements/api/announcements";
import { PageHeader } from "@/shared/components/layout/page-header";
import { PlaceholderHelp } from "@/shared/components/placeholder-help";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { CodeArea } from "@/shared/ui/code-area";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";
import { Markdown, MarkdownHint } from "@/shared/ui/markdown";
import { SectionCard } from "@/shared/ui/section-card";
import { Separator } from "@/shared/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { RecipientSummary } from "./recipient-summary";
import { useComposeAnnouncement } from "./use-compose-announcement";

interface ComposePageProps {
	announcementId: string;
}

export function AnnouncementComposePage({ announcementId }: ComposePageProps) {
	const { data: announcement } = useSuspenseQuery(
		announcementQueryOptions(announcementId),
	);
	const compose = useComposeAnnouncement(announcement);
	const [confirmOpen, setConfirmOpen] = useState(false);

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconSpeakerphone} title="Announcements">
				<Badge
					data-testid="announcement-status"
					variant={compose.isDraft ? "secondary" : "default"}
				>
					{announcement.status}
				</Badge>
			</PageHeader>

			<div className="flex-1 overflow-auto p-6">
				<div className="mx-auto w-full max-w-7xl">
					<div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
						<div className="bg-card overflow-hidden rounded-2xl shadow-2xl">
							<div className="space-y-6 p-6 sm:p-8">
								<div>
									<h1 className="text-2xl font-semibold tracking-tight">
										Compose
									</h1>
									<p className="text-muted-foreground mt-1 text-sm">
										Everyone you picked reads this on their dashboard. No email
										is sent.
									</p>
								</div>

								<div className="border-t" />

								<compose.form.AppField name="subject">
									{(field) => (
										<field.InputField
											disabled={!compose.isDraft}
											label="Subject"
											testId="announcement-subject"
										/>
									)}
								</compose.form.AppField>

								<Tabs defaultValue="body">
									<div className="mb-3 flex flex-wrap items-center justify-between gap-3">
										<MarkdownHint />
										<TabsList>
											<TabsTrigger value="body">Body</TabsTrigger>
											<TabsTrigger value="preview">Preview</TabsTrigger>
										</TabsList>
									</div>

									<TabsContent className="mt-0" value="body">
										<compose.form.AppField name="bodySource">
											{(field) => (
												<CodeArea
													className="h-[28rem] resize-none font-mono text-sm leading-relaxed"
													data-testid="announcement-body"
													disabled={!compose.isDraft}
													id="announcement-body"
													lang="markdown"
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
													value={field.state.value}
												/>
											)}
										</compose.form.AppField>
									</TabsContent>

									<TabsContent className="mt-0" value="preview">
										<div
											className="min-h-[28rem] rounded-md border p-6"
											data-testid="announcement-preview"
										>
											<Markdown content={compose.bodySource} />
										</div>
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
									recipients={announcement.recipients}
									totalRecipients={announcement.totalRecipients}
								/>
							</SectionCard>

							<SectionCard
								icon={IconBraces}
								title="Placeholders"
								variant="outlined"
							>
								<PlaceholderHelp
									dataColumns={announcement.dataColumns}
									issues={compose.issues}
								/>
							</SectionCard>

							<SectionCard icon={IconSend} title="Actions" variant="outlined">
								{compose.isDraft ? (
									<div className="space-y-3 text-sm">
										<Button
											className="w-full"
											data-testid="publish-announcement-btn"
											disabled={compose.isPublishing || !compose.canPublish}
											onClick={() => setConfirmOpen(true)}
										>
											<IconSend className="mr-2 size-4" />
											Publish
										</Button>
										<Button
											className="w-full"
											data-testid="save-announcement-btn"
											disabled={compose.isSaving}
											onClick={() => compose.save()}
											variant="outline"
										>
											<IconDeviceFloppy className="mr-2 size-4" />
											Save draft
										</Button>
										<Separator />
										<Button
											className="text-destructive hover:bg-destructive/10 hover:text-destructive w-full"
											data-testid="delete-announcement-btn"
											disabled={compose.isRemoving}
											onClick={() => compose.remove()}
											variant="ghost"
										>
											<IconTrash className="mr-2 size-4" />
											Delete draft
										</Button>
									</div>
								) : (
									<p className="text-muted-foreground text-sm">
										Published. Edit what one person sees from their profile in
										Users.
									</p>
								)}
							</SectionCard>
						</aside>
					</div>
				</div>
			</div>

			<Dialog onOpenChange={setConfirmOpen} open={confirmOpen}>
				<DialogContent data-testid="confirm-publish-dialog">
					<DialogHeader>
						<DialogTitle>Publish announcement?</DialogTitle>
						<DialogDescription>
							{announcement.totalRecipients}{" "}
							{announcement.totalRecipients === 1 ? "person" : "people"} will
							see it on their dashboard straight away. Publishing cannot be
							undone.
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
							data-testid="confirm-publish-btn"
							disabled={compose.isPublishing}
							onClick={() => {
								setConfirmOpen(false);
								compose.publish();
							}}
							type="button"
						>
							<IconSend className="mr-2 size-4" />
							Publish
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
