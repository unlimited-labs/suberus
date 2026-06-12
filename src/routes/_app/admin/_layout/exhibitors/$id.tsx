import { IconArrowLeft, IconBuildingStore } from "@tabler/icons-react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { DecideExhibitorDialog } from "@/components/admin/exhibitors/decide-exhibitor-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDateFormat } from "@/hooks/use-date-format";
import { exhibitorStatusBadge } from "@/lib/labels/exhibitor";
import { statusLabels, statusVariants } from "@/lib/labels/submission";
import { exhibitorDetailQueryOptions } from "@/server-fns/exhibitors";

export const Route = createFileRoute("/_app/admin/_layout/exhibitors/$id")({
	loader: async ({ params, context }) => {
		await context.queryClient.ensureQueryData(
			exhibitorDetailQueryOptions(params.id),
		);
	},
	component: ExhibitorDetailPage,
});

function BackButton() {
	return (
		<Link to="/admin/exhibitors">
			<Button variant="outline" size="sm">
				<IconArrowLeft className="mr-2 size-4" />
				Back
			</Button>
		</Link>
	);
}

function InfoRow({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
			<span className="w-32 shrink-0 text-muted-foreground">{label}</span>
			<span className="min-w-0 break-words">{children}</span>
		</div>
	);
}

const notProvided = <span className="text-muted-foreground">Not provided</span>;

function ExhibitorDetailPage() {
	const { id } = Route.useParams();
	const { data: exhibitor } = useSuspenseQuery(exhibitorDetailQueryOptions(id));
	const queryClient = useQueryClient();
	const { formatDate } = useDateFormat();
	const [decision, setDecision] = useState<"APPROVED" | "REJECTED" | null>(
		null,
	);

	if (!exhibitor) {
		return (
			<div className="flex h-full flex-col">
				<PageHeader icon={IconBuildingStore} title="Exhibitor">
					<BackButton />
				</PageHeader>
				<div className="flex flex-1 items-center justify-center">
					<p className="text-muted-foreground">Exhibitor not found</p>
				</div>
			</div>
		);
	}

	const { user, submission } = exhibitor;
	const contactName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
	const badge = exhibitorStatusBadge(exhibitor.status, exhibitor.appliedAt);
	const canDecide = exhibitor.status === "PENDING" && !!exhibitor.appliedAt;
	const deciderName = exhibitor.decidedBy
		? `${exhibitor.decidedBy.firstName ?? ""} ${exhibitor.decidedBy.lastName ?? ""}`.trim()
		: null;

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconBuildingStore} title="Exhibitor Details">
				<BackButton />
			</PageHeader>
			<div className="flex-1 overflow-auto p-6">
				<div className="mx-auto max-w-3xl space-y-6">
					<Card data-testid="exhibitor-company">
						<CardHeader>
							<CardTitle className="flex flex-wrap items-center justify-between gap-2">
								Company
								<Badge variant={badge.variant}>{badge.label}</Badge>
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3 text-sm">
							<InfoRow label="Name">
								{exhibitor.companyName || notProvided}
							</InfoRow>
							<InfoRow label="Website">
								{exhibitor.website ? (
									<a
										href={exhibitor.website}
										target="_blank"
										rel="noopener noreferrer"
										className="text-primary underline-offset-4 hover:underline"
									>
										{exhibitor.website}
									</a>
								) : (
									notProvided
								)}
							</InfoRow>
							<InfoRow label="Package">
								{exhibitor.package || notProvided}
							</InfoRow>
							<InfoRow label="Description">
								{exhibitor.description ? (
									<span className="whitespace-pre-wrap">
										{exhibitor.description}
									</span>
								) : (
									notProvided
								)}
							</InfoRow>
							<InfoRow label="Applied">
								{exhibitor.appliedAt ? (
									formatDate(new Date(exhibitor.appliedAt))
								) : (
									<span className="text-muted-foreground">Not applied yet</span>
								)}
							</InfoRow>
						</CardContent>
					</Card>

					<Card data-testid="exhibitor-contact">
						<CardHeader>
							<CardTitle>Contact</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3 text-sm">
							<InfoRow label="Name">{contactName || "—"}</InfoRow>
							<InfoRow label="Email">{user.email}</InfoRow>
							<InfoRow label="Fee">
								{user.fee?.paid ? (
									<Badge
										variant="outline"
										className="border-green-600 text-green-600"
									>
										{user.fee.type ?? "Paid"}
									</Badge>
								) : (
									<Badge variant="destructive">Unpaid</Badge>
								)}
							</InfoRow>
							<p className="text-muted-foreground">
								The conference fee is managed on the{" "}
								<Link
									to="/admin/users/$id"
									params={{ id: user.id }}
									className="text-primary underline-offset-4 hover:underline"
								>
									user details
								</Link>{" "}
								page.
							</p>
						</CardContent>
					</Card>

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

					<Card data-testid="exhibitor-decision">
						<CardHeader>
							<CardTitle>Decision</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3 text-sm">
							{canDecide ? (
								<div className="flex flex-col gap-2 sm:flex-row">
									<Button
										data-testid="exhibitor-approve"
										onClick={() => setDecision("APPROVED")}
									>
										Approve
									</Button>
									<Button
										data-testid="exhibitor-reject"
										variant="destructive"
										onClick={() => setDecision("REJECTED")}
									>
										Reject
									</Button>
								</div>
							) : exhibitor.status === "PENDING" ? (
								<p className="text-muted-foreground">
									Application not completed — no decision possible
								</p>
							) : (
								<div className="space-y-2">
									<Badge variant={badge.variant}>{badge.label}</Badge>
									{exhibitor.decidedAt && (
										<p className="text-muted-foreground">
											Decided
											{deciderName ? ` by ${deciderName}` : ""} on{" "}
											{formatDate(new Date(exhibitor.decidedAt))}
										</p>
									)}
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
			{decision && (
				<DecideExhibitorDialog
					exhibitorId={exhibitor.id}
					companyName={exhibitor.companyName}
					decision={decision}
					open
					onOpenChange={(open) => {
						if (!open) setDecision(null);
					}}
					onDecided={() => {
						void queryClient.invalidateQueries({
							queryKey: ["admin", "exhibitors"],
						});
					}}
				/>
			)}
		</div>
	);
}
