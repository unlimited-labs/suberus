import { statusLabels, statusVariants } from "@/shared/lib/labels/submission";
import { Badge } from "@/shared/ui/badge";
import { SectionCard } from "@/shared/ui/section-card";
import type { ExhibitorDetail } from "./types";

interface ExhibitorPresentationCardProps {
	submission: ExhibitorDetail["submission"];
}

export function ExhibitorPresentationCard({
	submission,
}: ExhibitorPresentationCardProps) {
	return (
		<div data-testid="exhibitor-presentation">
			<SectionCard
				action={
					submission && (
						<Badge variant={statusVariants[submission.status]}>
							{statusLabels[submission.status]}
						</Badge>
					)
				}
				contentClassName="space-y-4 text-sm"
				title="Presentation"
			>
				{submission ? (
					<>
						<p className="font-medium">{submission.title}</p>
						<div className="space-y-1">
							<p className="text-muted-foreground">Authors</p>
							<ul className="space-y-1">
								{submission.authors.map((author) => (
									<li
										className="flex flex-wrap items-center gap-2"
										key={author.id}
									>
										<span>
											{author.firstName} {author.lastName}
										</span>
										<span className="text-muted-foreground text-xs">
											{author.email}
										</span>
										{author.isPresenter && (
											<Badge variant="secondary">Presenter</Badge>
										)}
									</li>
								))}
							</ul>
						</div>
						{submission.content && (
							<div className="space-y-1">
								<p className="text-muted-foreground">Abstract</p>
								<div className="bg-muted/30 max-h-96 overflow-auto rounded-lg border p-4 leading-relaxed whitespace-pre-wrap">
									{submission.content}
								</div>
							</div>
						)}
					</>
				) : (
					<p className="text-muted-foreground">No presentation</p>
				)}
			</SectionCard>
		</div>
	);
}
