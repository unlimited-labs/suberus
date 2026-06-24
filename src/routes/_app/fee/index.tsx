import { IconCash, IconCheck, IconInfoCircle } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	paymentInstructionsQueryOptions,
	userFeeQueryOptions,
} from "@/features/fee/api/fee";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { PageHeader } from "@/shared/components/layout/page-header";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Badge } from "@/shared/ui/badge";
import { Markdown } from "@/shared/ui/markdown";

export const Route = createFileRoute("/_app/fee/")({
	loader: async ({ context }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(userFeeQueryOptions()),
			context.queryClient.ensureQueryData(paymentInstructionsQueryOptions()),
		]);
	},
	component: FeePage,
});

function FeePage() {
	const { data: fee } = useSuspenseQuery(userFeeQueryOptions());
	const { data: instructions } = useSuspenseQuery(
		paymentInstructionsQueryOptions(),
	);
	const { formatDate } = useDateFormat();

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconCash} title="Conference Fee" />

			<div className="flex-1 overflow-auto p-4 sm:p-8">
				<div className="mx-auto max-w-5xl space-y-8">
					{fee ? (
						<SettingsSection
							icon={IconCash}
							title="Payment Confirmed"
							description="Your conference fee has been received"
							delay={0}
						>
							<div className="space-y-6">
								<div className="relative overflow-hidden rounded-xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-50 to-green-50 p-6 transition-all duration-500 dark:from-emerald-950/20 dark:to-green-950/20">
									<div className="absolute inset-0 opacity-[0.03]">
										<svg
											className="h-full w-full"
											xmlns="http://www.w3.org/2000/svg"
											aria-hidden="true"
										>
											<defs>
												<pattern
													id="fee-pattern"
													x="0"
													y="0"
													width="40"
													height="40"
													patternUnits="userSpaceOnUse"
												>
													<circle cx="20" cy="20" r="1.5" fill="currentColor" />
												</pattern>
											</defs>
											<rect
												width="100%"
												height="100%"
												fill="url(#fee-pattern)"
											/>
										</svg>
									</div>

									<div className="relative flex items-start justify-between gap-4">
										<div className="flex items-center gap-4">
											<div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 transition-all duration-500 dark:text-emerald-400">
												<IconCheck className="size-7" strokeWidth={2.5} />
											</div>
											<div>
												<div className="mb-1 text-sm font-medium uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
													Payment Status
												</div>
												<div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
													Payment Received
												</div>
											</div>
										</div>

										<Badge
											variant="default"
											className="shrink-0 bg-emerald-500 text-white transition-all hover:bg-emerald-600 dark:bg-emerald-600"
										>
											<IconCheck className="size-3" />
											Paid
										</Badge>
									</div>
								</div>

								<div className="grid gap-4 sm:grid-cols-2">
									<div className="group relative overflow-hidden rounded-lg border border-border/50 bg-card/50 p-5 backdrop-blur-sm transition-all duration-300 hover:border-border hover:shadow-md">
										<div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-primary to-primary/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
										<div className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
											Fee Type
										</div>
										<div className="text-lg font-semibold text-foreground">
											{fee.type}
										</div>
									</div>

									{fee.amount !== null && fee.currency && (
										<div className="group relative overflow-hidden rounded-lg border border-border/50 bg-card/50 p-5 backdrop-blur-sm transition-all duration-300 hover:border-border hover:shadow-md">
											<div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-primary to-primary/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
											<div className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
												Amount
											</div>
											<div className="flex items-baseline gap-1.5">
												<span className="text-lg font-semibold text-foreground">
													{fee.amount.toFixed(2)}
												</span>
												<span className="text-sm font-medium text-muted-foreground">
													{fee.currency}
												</span>
											</div>
										</div>
									)}

									{fee.paidAt && (
										<div className="group relative overflow-hidden rounded-lg border border-border/50 bg-card/50 p-5 backdrop-blur-sm transition-all duration-300 hover:border-border hover:shadow-md sm:col-span-2">
											<div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-emerald-500 to-emerald-500/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
											<div className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
												Payment Date
											</div>
											<div className="text-lg font-semibold text-foreground">
												{formatDate(new Date(fee.paidAt))}
											</div>
										</div>
									)}
								</div>
							</div>
						</SettingsSection>
					) : (
						<Alert className="animate-fade-in-up border-amber-500/30 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20">
							<IconInfoCircle className="text-amber-600 dark:text-amber-400" />
							<AlertTitle className="text-amber-900 dark:text-amber-100">
								Payment Not Received
							</AlertTitle>
							<AlertDescription className="text-amber-700 dark:text-amber-300">
								You have not paid the conference fee yet. Please follow the
								payment instructions below.
							</AlertDescription>
						</Alert>
					)}

					<SettingsSection
						icon={IconInfoCircle}
						title="Payment Instructions"
						description="Important information about conference fee payment"
						delay={100}
					>
						<Markdown content={instructions} />
					</SettingsSection>

					<div className="h-12" />
				</div>
			</div>
		</div>
	);
}
