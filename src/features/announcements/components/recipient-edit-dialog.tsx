import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
	announcementRecipientDraftQueryOptions,
	updateAnnouncementRecipientFn,
	userAnnouncementsQueryOptions,
} from "@/features/announcements/api/announcements";
import { getErrorMessage } from "@/shared/lib/error-message";
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
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Markdown } from "@/shared/ui/markdown";
import { Skeleton } from "@/shared/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

interface RecipientDraft {
	recipientId: string;
	subject: string;
	bodySource: string;
}

interface EditFormProps {
	draft: RecipientDraft;
	userId: string;
	onClose: () => void;
}

/** Mounted under `key={draft.recipientId}`, so switching recipient resets the
 * fields without an effect and one person's text can never be saved onto another. */
function EditForm({ draft, userId, onClose }: EditFormProps) {
	const queryClient = useQueryClient();
	const [subject, setSubject] = useState(draft.subject);
	const [bodySource, setBodySource] = useState(draft.bodySource);

	const save = useMutation({
		mutationFn: () =>
			updateAnnouncementRecipientFn({
				data: { recipientId: draft.recipientId, subject, bodySource },
			}),
		onSuccess: async () => {
			toast.success("Saved for this person only");
			await queryClient.invalidateQueries({
				queryKey: userAnnouncementsQueryOptions(userId).queryKey,
			});
			await queryClient.invalidateQueries({
				queryKey: announcementRecipientDraftQueryOptions(draft.recipientId)
					.queryKey,
			});
			onClose();
		},
		onError: (e) => toast.error(getErrorMessage(e, "Could not save")),
	});

	return (
		<>
			<div className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="recipient-subject">Subject</Label>
					<Input
						data-testid="recipient-subject"
						id="recipient-subject"
						onChange={(e) => setSubject(e.target.value)}
						value={subject}
					/>
				</div>

				<Tabs defaultValue="body">
					<TabsList>
						<TabsTrigger value="body">Body</TabsTrigger>
						<TabsTrigger value="preview">Preview</TabsTrigger>
					</TabsList>
					<TabsContent value="body">
						<CodeArea
							className="h-72 resize-none font-mono text-sm"
							data-testid="recipient-body"
							id="recipient-body"
							lang="markdown"
							onChange={(e) => setBodySource(e.target.value)}
							value={bodySource}
						/>
					</TabsContent>
					<TabsContent value="preview">
						<div className="h-72 overflow-y-auto rounded-md border p-4">
							<Markdown content={bodySource} />
						</div>
					</TabsContent>
				</Tabs>
			</div>

			<DialogFooter>
				<Button onClick={onClose} type="button" variant="outline">
					Cancel
				</Button>
				<Button
					data-testid="save-recipient-btn"
					disabled={save.isPending || !subject.trim() || !bodySource.trim()}
					onClick={() => save.mutate()}
					type="button"
				>
					Save changes
				</Button>
			</DialogFooter>
		</>
	);
}

interface RecipientEditDialogProps {
	recipientId: string | null;
	userId: string;
	onClose: () => void;
}

export function RecipientEditDialog({
	recipientId,
	userId,
	onClose,
}: RecipientEditDialogProps) {
	const { data } = useQuery({
		...announcementRecipientDraftQueryOptions(recipientId ?? ""),
		enabled: recipientId !== null,
	});
	const draft = data?.recipientId === recipientId ? data : null;

	return (
		<Dialog
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
			open={recipientId !== null}
		>
			<DialogContent
				className="sm:max-w-2xl"
				data-testid="recipient-edit-dialog"
			>
				<DialogHeader>
					<DialogTitle>Edit this person's copy</DialogTitle>
					<DialogDescription>
						Changes apply to this recipient only. Everyone else keeps the
						original wording.
					</DialogDescription>
				</DialogHeader>

				{draft ? (
					<EditForm
						draft={draft}
						key={draft.recipientId}
						onClose={onClose}
						userId={userId}
					/>
				) : (
					<div className="space-y-3">
						<Skeleton className="h-9 w-full" />
						<Skeleton className="h-72 w-full" />
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
