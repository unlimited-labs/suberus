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
							delay={0}
							description="Your conference fee has been received"
							icon={IconCash}
							title="Payment Confirmed"
						>
							<div className="space-y-6">
								<div className="relative overflow-hidden rounded-xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-50 to-green-50 p-6 transition-colors duration-500 dark:from-emerald-950/20 dark:to-green-950/20">
									<div className="absolute inset-0 opacity-[0.03]">
										<svg
											aria-hidden="true"
											className="h-full w-full"
											xmlns="http://www.w3.org/2000/svg"
										>
											<defs>
												<pattern
													height="40"
													id="fee-pattern"
													patternUnits="userSpaceOnUse"
													width="40"
													x="0"
													y="0"
												>
													<circle cx="20" cy="20" fill="currentColor" r="1.5" />
												</pattern>
											</defs>
											<rect
												fill="url(#fee-pattern)"
												height="100%"
												width="100%"
											/>
										</svg>
									</div>

									<div className="relative flex items-start justify-between gap-4">
										<div className="flex items-center gap-4">
											<div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 transition-colors duration-500 dark:text-emerald-400">
												<IconCheck className="size-7" strokeWidth={2.5} />
											</div>
											<div>
												<div className="mb-1 text-sm font-medium tracking-wider text-emerald-700 uppercase dark:text-emerald-300">
													Payment Status
												</div>
												<div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
													Payment Received
												</div>
											</div>
										</div>

										<Badge
											className="shrink-0 bg-emerald-500 text-white transition-colors hover:bg-emerald-600 dark:bg-emerald-600"
											variant="default"
										>
											<IconCheck className="size-3" />
											Paid
										</Badge>
									</div>
								</div>

								<div className="grid gap-4 sm:grid-cols-2">
									<div className="group border-border/50 bg-card/50 hover:border-border relative overflow-hidden rounded-lg border p-5 backdrop-blur-sm transition-[border-color,box-shadow] duration-300 hover:shadow-md">
										<div className="from-primary to-primary/50 absolute top-0 left-0 h-full w-1 bg-gradient-to-b opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
										<div className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wider uppercase">
											Fee Type
										</div>
										<div className="text-foreground text-lg font-semibold">
											{fee.type}
										</div>
									</div>

									{fee.amount !== null && fee.currency && (
										<div className="group border-border/50 bg-card/50 hover:border-border relative overflow-hidden rounded-lg border p-5 backdrop-blur-sm transition-[border-color,box-shadow] duration-300 hover:shadow-md">
											<div className="from-primary to-primary/50 absolute top-0 left-0 h-full w-1 bg-gradient-to-b opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
											<div className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wider uppercase">
												Amount
											</div>
											<div className="flex items-baseline gap-1.5">
												<span className="text-foreground text-lg font-semibold">
													{fee.amount.toFixed(2)}
												</span>
												<span className="text-muted-foreground text-sm font-medium">
													{fee.currency}
												</span>
											</div>
										</div>
									)}

									{fee.paidAt && (
										<div className="group border-border/50 bg-card/50 hover:border-border relative overflow-hidden rounded-lg border p-5 backdrop-blur-sm transition-[border-color,box-shadow] duration-300 hover:shadow-md sm:col-span-2">
											<div className="absolute top-0 left-0 h-full w-1 bg-gradient-to-b from-emerald-500 to-emerald-500/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
											<div className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wider uppercase">
												Payment Date
											</div>
											<div className="text-foreground text-lg font-semibold">
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
						delay={100}
						description="Important information about conference fee payment"
						icon={IconInfoCircle}
						title="Payment Instructions"
					>
						<Markdown content={instructions} />
					</SettingsSection>

					<div className="h-12" />
				</div>
			</div>
		</div>
	);
}
