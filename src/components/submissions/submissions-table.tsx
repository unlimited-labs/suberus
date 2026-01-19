import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import type { MockSubmission, SubmissionStatus } from "@/lib/mock-data/submissions";

interface SubmissionsTableProps {
	submissions: MockSubmission[];
}

const statusColors: Record<
	SubmissionStatus,
	"default" | "secondary" | "destructive" | "outline"
> = {
	DRAFT: "outline",
	SUBMITTED: "default",
	UNDER_REVIEW: "secondary",
	REVIEWS_COMPLETE: "secondary",
	AWAITING_DECISION: "secondary",
	REVISE_REQUIRED: "outline",
	RESUBMITTED: "default",
	ACCEPTED: "default",
	CONDITIONALLY_ACCEPTED: "default",
	REJECTED: "destructive",
	WITHDRAWN: "outline",
};

const statusLabels: Record<SubmissionStatus, string> = {
	DRAFT: "Szkic",
	SUBMITTED: "Zgłoszono",
	UNDER_REVIEW: "W recenzji",
	REVIEWS_COMPLETE: "Recenzje zakończone",
	AWAITING_DECISION: "Oczekuje na decyzję",
	REVISE_REQUIRED: "Wymagane poprawki",
	RESUBMITTED: "Ponownie zgłoszono",
	ACCEPTED: "Zaakceptowano",
	CONDITIONALLY_ACCEPTED: "Warunkowo zaakceptowano",
	REJECTED: "Odrzucono",
	WITHDRAWN: "Wycofano",
};

const typeLabels = {
	ABSTRACT: "Abstract",
	FULL_PAPER: "Artykuł",
	POSTER: "Poster",
};

export function SubmissionsTable({ submissions }: SubmissionsTableProps) {
	return (
		<>
			{/* Desktop Table */}
			<div className="hidden md:block rounded-2xl bg-card shadow-2xl border overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead className="bg-muted/50 border-b">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
									ID
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
									Tytuł
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
									Typ
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
									Status
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
									Runda
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
									Wersja
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
									Data zgłoszenia
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
									Ostatnia modyfikacja
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{submissions.map((submission) => (
								<tr
									key={submission.id}
									className="hover:bg-muted/30 transition-colors cursor-pointer"
								>
									<td className="px-6 py-4 whitespace-nowrap">
										<Link
											to="/submissions/$id"
											params={{ id: submission.id }}
											className="text-sm font-mono text-muted-foreground hover:text-primary"
										>
											{submission.id}
										</Link>
									</td>
									<td className="px-6 py-4">
										<Link
											to="/submissions/$id"
											params={{ id: submission.id }}
											className="text-sm font-medium text-foreground hover:text-primary line-clamp-2"
										>
											{submission.title}
										</Link>
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										<span className="text-sm text-muted-foreground">
											{typeLabels[submission.type]}
										</span>
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										<Badge variant={statusColors[submission.status]}>
											{statusLabels[submission.status]}
										</Badge>
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-center">
										<span className="text-sm text-muted-foreground">
											{submission.currentRound}
										</span>
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-center">
										<span className="text-sm text-muted-foreground">
											{submission.currentVersion}
										</span>
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										<span className="text-sm text-muted-foreground">
											{submission.createdAt.toLocaleDateString("pl-PL", {
												day: "2-digit",
												month: "2-digit",
												year: "numeric",
											})}
										</span>
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										<span className="text-sm text-muted-foreground">
											{submission.updatedAt.toLocaleDateString("pl-PL", {
												day: "2-digit",
												month: "2-digit",
												year: "numeric",
											})}
										</span>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			{/* Mobile Cards */}
			<div className="md:hidden space-y-4">
				{submissions.map((submission) => (
					<Link
						key={submission.id}
						to="/submissions/$id"
						params={{ id: submission.id }}
						className="block"
					>
						<div className="rounded-2xl bg-card shadow-xl border p-4 hover:shadow-2xl transition-shadow">
							<div className="space-y-3">
								{/* Title and Status */}
								<div className="space-y-2">
									<h3 className="font-semibold text-foreground line-clamp-2">
										{submission.title}
									</h3>
									<div className="flex items-center gap-2 flex-wrap">
										<Badge variant={statusColors[submission.status]}>
											{statusLabels[submission.status]}
										</Badge>
										<span className="text-sm text-muted-foreground">
											{typeLabels[submission.type]}
										</span>
									</div>
								</div>

								{/* Meta Info */}
								<div className="grid grid-cols-2 gap-2 text-sm text-foreground">
									<div>
										<span className="text-muted-foreground">ID:</span>{" "}
										<span className="font-mono text-xs">{submission.id}</span>
									</div>
									<div>
										<span className="text-muted-foreground">Runda:</span>{" "}
										{submission.currentRound}
									</div>
									<div>
										<span className="text-muted-foreground">Wersja:</span>{" "}
										{submission.currentVersion}
									</div>
									<div>
										<span className="text-muted-foreground">Zgłoszono:</span>{" "}
										{submission.createdAt.toLocaleDateString("pl-PL", {
											day: "2-digit",
											month: "2-digit",
										})}
									</div>
								</div>

								{/* Last Modified */}
								<div className="text-xs text-muted-foreground pt-2 border-t">
									Ostatnia modyfikacja:{" "}
									{submission.updatedAt.toLocaleDateString("pl-PL", {
										day: "2-digit",
										month: "2-digit",
										year: "numeric",
										hour: "2-digit",
										minute: "2-digit",
									})}
								</div>
							</div>
						</div>
					</Link>
				))}
			</div>
		</>
	);
}
