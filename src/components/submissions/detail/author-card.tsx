import { IconStarFilled } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MockAuthor } from "@/lib/mock-data/submissions";

interface AuthorCardProps {
	author: MockAuthor;
	index: number;
}

export function AuthorCard({ author, index }: AuthorCardProps) {
	const isPresenter = author.isPresenter;

	return (
		<div
			className={cn(
				"flex items-start gap-3 p-3 rounded-lg border transition-colors",
				isPresenter
					? "border-primary/30 bg-primary/5"
					: "border-border/50 bg-muted/30",
			)}
		>
			<div
				className={cn(
					"w-8 h-8 rounded-md flex items-center justify-center text-sm font-semibold flex-shrink-0",
					isPresenter
						? "bg-primary/10 text-primary"
						: "bg-muted text-muted-foreground",
				)}
			>
				{index + 1}
			</div>
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 flex-wrap">
					<span className="font-medium text-foreground">
						{author.firstName} {author.lastName}
					</span>
					{isPresenter && (
						<Badge
							variant="secondary"
							className="text-xs gap-1 bg-primary/10 text-primary border-primary/20"
						>
							<IconStarFilled className="size-3" />
							Prezenter
						</Badge>
					)}
				</div>
				<p className="text-sm text-muted-foreground mt-0.5">
					{author.affiliation}
				</p>
				<p className="text-xs text-muted-foreground/70">{author.email}</p>
			</div>
		</div>
	);
}
