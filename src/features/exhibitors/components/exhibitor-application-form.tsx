import { IconInfoCircle, IconLoader2, IconSend } from "@tabler/icons-react";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/ui/card";
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
		<Card>
			<CardHeader>
				<CardTitle>Exhibitor Application</CardTitle>
				<CardDescription>
					Represent your company at the conference
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
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
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						void form.handleSubmit();
					}}
					className="space-y-6"
				>
					<fieldset disabled={isLocked} className="min-w-0 space-y-6">
						<ExhibitorCompanySection form={form} />

						{allowPresentation && (
							<>
								<div className="border-t" />
								<ExhibitorPresentationSection
									form={form}
									addPresentation={addPresentation}
									submissionAttempts={submissionAttempts}
								/>
							</>
						)}
					</fieldset>

					{!isLocked && (
						<div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
							{canWithdraw ? (
								<Button
									type="button"
									variant="outline"
									className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
									data-testid="exhibitor-withdraw"
									onClick={() => setWithdrawOpen(true)}
								>
									Withdraw application
								</Button>
							) : (
								<span />
							)}
							<form.Subscribe selector={(s) => s.isSubmitting}>
								{(isSubmitting) => (
									<Button
										type="submit"
										className="gap-2 px-6"
										disabled={isSubmitting}
										data-testid="exhibitor-submit"
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
			</CardContent>

			<WithdrawExhibitorDialog
				open={withdrawOpen}
				onOpenChange={setWithdrawOpen}
				hasPresentation={Boolean(submission)}
			/>
		</Card>
	);
}
