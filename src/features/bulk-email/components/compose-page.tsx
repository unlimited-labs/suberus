import { useSuspenseQuery } from "@tanstack/react-query";
import { bulkEmailCampaignQueryOptions } from "@/features/bulk-email/api/bulk-email";
import { Button } from "@/shared/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { CampaignProgressCard } from "./campaign-progress-card";
import { FormatSelector } from "./format-selector";
import { PlaceholderHelp } from "./placeholder-help";
import { PreviewIframe } from "./preview-iframe";
import { RecipientSummary } from "./recipient-summary";
import { useComposeCampaign } from "./use-compose-campaign";

interface ComposePageProps {
	campaignId: string;
}

export function ComposePage({ campaignId }: ComposePageProps) {
	const { data: campaign } = useSuspenseQuery(
		bulkEmailCampaignQueryOptions(campaignId),
	);
	const compose = useComposeCampaign(campaign);

	return (
		<div className="mx-auto max-w-5xl space-y-4 p-4">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">Bulk email</h1>
				<span
					className="text-sm text-muted-foreground"
					data-testid="campaign-status"
				>
					{campaign.status}
				</span>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Recipients</CardTitle>
				</CardHeader>
				<CardContent>
					<RecipientSummary
						recipients={campaign.recipients}
						sentCount={campaign.sentCount}
						failedCount={campaign.failedCount}
					/>
				</CardContent>
			</Card>

			<CampaignProgressCard campaign={campaign} jobId={compose.jobId} />

			<Card>
				<CardHeader>
					<CardTitle>Compose</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="campaign-subject">Subject</Label>
						<Input
							id="campaign-subject"
							data-testid="campaign-subject"
							value={compose.subject}
							onChange={(e) => compose.setSubject(e.target.value)}
							disabled={!compose.isDraft}
						/>
					</div>

					<FormatSelector
						value={compose.format}
						onChange={compose.setFormat}
						disabled={!compose.isDraft}
					/>

					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="campaign-body">Body</Label>
							<Textarea
								id="campaign-body"
								data-testid="campaign-body"
								value={compose.bodySource}
								onChange={(e) => compose.setBodySource(e.target.value)}
								disabled={!compose.isDraft}
								className="h-96 font-mono text-sm"
							/>
						</div>
						<PreviewIframe
							body={compose.preview.body}
							isHtml={compose.preview.isHtml}
							isLoading={compose.isPreviewLoading}
						/>
					</div>

					<PlaceholderHelp />
				</CardContent>
				<CardFooter className="flex flex-wrap gap-2">
					<Button
						variant="outline"
						data-testid="save-draft-btn"
						onClick={() => compose.save()}
						disabled={!compose.isDraft || compose.isSaving}
					>
						Save draft
					</Button>
					<Button
						variant="secondary"
						data-testid="test-send-btn"
						onClick={() => compose.sendTest()}
						disabled={compose.isTesting}
					>
						Test (send to me)
					</Button>
					<Button
						data-testid="send-campaign-btn"
						onClick={() => compose.send()}
						disabled={!compose.isDraft || compose.isSending}
					>
						Send
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
