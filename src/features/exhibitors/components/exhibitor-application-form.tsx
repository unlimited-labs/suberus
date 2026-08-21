import { IconInfoCircle, IconLoader2, IconSend } from "@tabler/icons-react";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { SectionCard } from "@/shared/ui/section-card";
import { ExhibitorCompanySection } from "./exhibitor-company-section";
import { ExhibitorPresentationSection } from "./exhibitor-presentation-section";
import {
	type MyExhibitor,
	useExhibitorApplicationForm,
} from "./use-exhibitor-application-form";
import { WithdrawExhibitorDialog } from "./withdraw-exhibitor-dialog";

interface ExhibitorApplicationFormProps {
	exhibitor: MyExhibitor;
	allowPresentation: boolean;
}

export function ExhibitorApplicationForm({
	exhibitor,
	allowPresentation,
}: ExhibitorApplicationFormProps) {
	const submission = exhibitor.submission;
	const {
		form,
		addPresentation,
		submissionAttempts,
		isLocked,
		canWithdraw,
		withdrawOpen,
		setWithdrawOpen,
	} = useExhibitorApplicationForm({ exhibitor, allowPresentation });

	return (
		<>
			<SectionCard
				contentClassName="space-y-6"
				description="Represent your company at the conference"
				title="Exhibitor Application"
			>
				{isLocked && (
					<Alert>
						<IconInfoCircle className="size-4" />
						<AlertDescription>
							{exhibitor.status === "WITHDRAWN"
								? "Application withdrawn."
								: "Your application has been decided — contact the organizer to make changes."}
						</AlertDescription>
					</Alert>
				)}

				<form
					className="space-y-6"
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						void form.handleSubmit();
					}}
				>
					<fieldset className="min-w-0 space-y-6" disabled={isLocked}>
						<ExhibitorCompanySection form={form} />

						{allowPresentation && (
							<>
								<div className="border-t" />
								<ExhibitorPresentationSection
									addPresentation={addPresentation}
									form={form}
									submissionAttempts={submissionAttempts}
								/>
							</>
						)}
					</fieldset>

					{!isLocked && (
						<div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
							{canWithdraw ? (
								<Button
									className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
									data-testid="exhibitor-withdraw"
									onClick={() => setWithdrawOpen(true)}
									type="button"
									variant="outline"
								>
									Withdraw application
								</Button>
							) : (
								<span />
							)}
							<form.Subscribe selector={(s) => s.isSubmitting}>
								{(isSubmitting) => (
									<Button
										className="gap-2 px-6"
										data-testid="exhibitor-submit"
										disabled={isSubmitting}
										type="submit"
									>
										{isSubmitting ? (
											<>
												<IconLoader2 className="size-4 animate-spin" />
												{exhibitor.appliedAt ? "Saving..." : "Submitting..."}
											</>
										) : (
											<>
												<IconSend className="size-4" />
												{exhibitor.appliedAt
													? "Save changes"
													: "Submit application"}
											</>
										)}
									</Button>
								)}
							</form.Subscribe>
						</div>
					)}
				</form>
			</SectionCard>

			<WithdrawExhibitorDialog
				hasPresentation={Boolean(submission)}
				onOpenChange={setWithdrawOpen}
				open={withdrawOpen}
			/>
		</>
	);
}
