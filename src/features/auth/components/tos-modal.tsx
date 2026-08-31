import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";
import { Markdown } from "@/shared/ui/markdown";

interface TosModalProps {
	open: boolean;
	content: string;
	onOpenChange: (open: boolean) => void;
}

export function TosModal({ open, content, onOpenChange }: TosModalProps) {
	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="flex max-h-[80vh] flex-col overflow-hidden sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>Terms of Service</DialogTitle>
					<DialogDescription className="sr-only">
						The conference terms of service document.
					</DialogDescription>
				</DialogHeader>
				<div className="fade-y flex-1 overflow-y-auto pr-2">
					<Markdown content={content} />
				</div>
				<DialogFooter showCloseButton />
			</DialogContent>
		</Dialog>
	);
}
