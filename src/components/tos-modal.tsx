import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Markdown } from "@/components/ui/markdown";

interface TosModalProps {
	open: boolean;
	content: string;
	onOpenChange: (open: boolean) => void;
}

export function TosModal({ open, content, onOpenChange }: TosModalProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
				<DialogHeader>
					<DialogTitle>Terms of Service</DialogTitle>
				</DialogHeader>
				<div className="flex-1 overflow-y-auto pr-2">
					<Markdown content={content} />
				</div>
				<DialogFooter showCloseButton />
			</DialogContent>
		</Dialog>
	);
}
