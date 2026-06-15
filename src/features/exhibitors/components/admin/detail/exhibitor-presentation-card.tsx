import { statusLabels, statusVariants } from "@/shared/lib/labels/submission";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import type { ExhibitorDetail } from "./types";

interface ExhibitorPresentationCardProps {
	submission: ExhibitorDetail["submission"];
}

export function ExhibitorPresentationCard({
	submission,
}: ExhibitorPresentationCardProps) {
	return (
		<Card data-testid="exhibitor-presentation">
			<CardHeader>
				<CardTitle className="flex flex-wrap items-center justify-between gap-2">
					Presentation
					{submission && (
						<Badge variant={statusVariants[submission.status]}>
							{statusLabels[submission.status]}
						</Badge>
					)}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4 text-sm">
				{submission ? (
					<>
						<p className="font-medium">{submission.title}</p>
						<div className="space-y-1">
							<p className="text-muted-foreground">Authors</p>
							<ul className="space-y-1">
								{submission.authors.map((author) => (
									<li
										key={author.id}
										className="flex flex-wrap items-center gap-2"
									>
										<span>
											{author.firstName} {author.lastName}
										</span>
										<span className="text-xs text-muted-foreground">
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
								<div className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-4 leading-relaxed">
									{submission.content}
								</div>
							</div>
						)}
					</>
				) : (
					<p className="text-muted-foreground">No presentation</p>
				)}
			</CardContent>
		</Card>
	);
}
