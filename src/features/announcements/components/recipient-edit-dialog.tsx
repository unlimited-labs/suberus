import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

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
	const queryClient = useQueryClient();
	const { data } = useQuery({
		...announcementRecipientDraftQueryOptions(recipientId ?? ""),
		enabled: recipientId !== null,
	});
	const [subject, setSubject] = useState("");
	const [bodySource, setBodySource] = useState("");

	useEffect(() => {
		if (!data) return;
		setSubject(data.subject);
		setBodySource(data.bodySource);
	}, [data]);

	const save = useMutation({
		mutationFn: () =>
			updateAnnouncementRecipientFn({
				data: { recipientId: recipientId ?? "", subject, bodySource },
			}),
		onSuccess: async () => {
			toast.success("Saved for this person only");
			await queryClient.invalidateQueries({
				queryKey: userAnnouncementsQueryOptions(userId).queryKey,
			});
			await queryClient.invalidateQueries({
				queryKey: announcementRecipientDraftQueryOptions(recipientId ?? "")
					.queryKey,
			});
			onClose();
		},
		onError: (e) => toast.error(getErrorMessage(e, "Could not save")),
	});

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
			</DialogContent>
		</Dialog>
	);
}
