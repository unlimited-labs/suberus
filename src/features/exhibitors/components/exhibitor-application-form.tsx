import {
	IconAlertTriangle,
	IconBuildingStore,
	IconInfoCircle,
	IconLoader2,
	IconPresentation,
	IconSend,
} from "@tabler/icons-react";
import { useStore } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
	type getMyExhibitorFn,
	myExhibitorQueryOptions,
	saveExhibitorApplicationFn,
	withdrawMyExhibitorFn,
} from "@/features/exhibitors/api/exhibitors";
import { exhibitorPresentationSchema } from "@/features/exhibitors/validations";
import {
	type Author,
	AuthorsInput,
} from "@/features/submissions/components/form/authors-input";
import { useAppForm } from "@/shared/hooks/use-app-form";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";
import { Field, FieldError } from "@/shared/ui/field";

type MyExhibitor = NonNullable<Awaited<ReturnType<typeof getMyExhibitorFn>>>;

const emptyAuthor: Author = {
	firstName: "",
	lastName: "",
	email: "",
	affiliationId: null,
	affiliationName: "",
	isPresenter: true,
};

const formSchema = z
	.object({
		companyName: z
			.string()
			.min(1, "Company name is required")
			.max(200, "Company name must be at most 200 characters"),
		description: z
			.string()
			.max(5000, "Description must be at most 5000 characters"),
		website: z.url("Invalid URL").or(z.literal("")),
		addPresentation: z.boolean(),
		presentationTitle: z.string(),
		presentationContent: z.string(),
		authors: z.array(
			z.object({
				firstName: z.string(),
				lastName: z.string(),
				email: z.string(),
				affiliationId: z.string().nullable(),
				affiliationName: z.string(),
				isPresenter: z.boolean(),
			}),
		),
	})
	.superRefine((values, ctx) => {
		if (!values.addPresentation) return;
		// Reuse the server-side presentation schema so messages stay in sync
		const result = exhibitorPresentationSchema.safeParse({
			title: values.presentationTitle,
			content: values.presentationContent,
			authors: values.authors,
		});
		if (result.success) return;
		for (const issue of result.error.issues) {
			const field =
				issue.path[0] === "title"
					? "presentationTitle"
					: issue.path[0] === "content"
						? "presentationContent"
						: "authors";
			ctx.addIssue({ code: "custom", message: issue.message, path: [field] });
		}
	});

interface ExhibitorApplicationFormProps {
	exhibitor: MyExhibitor;
	allowPresentation: boolean;
}

export function ExhibitorApplicationForm({
	exhibitor,
	allowPresentation,
}: ExhibitorApplicationFormProps) {
	const queryClient = useQueryClient();
	const [withdrawOpen, setWithdrawOpen] = useState(false);
	const submission = exhibitor.submission;

	// Mirrors the server lock condition in saveExhibitorApplication
	const isLocked =
		exhibitor.status !== "PENDING" || Boolean(exhibitor.decidedAt);
	const canWithdraw = !isLocked && Boolean(exhibitor.appliedAt);

	const form = useAppForm({
		defaultValues: {
			companyName: exhibitor.companyName ?? "",
			description: exhibitor.description ?? "",
			website: exhibitor.website ?? "",
			addPresentation: Boolean(submission),
			presentationTitle: submission?.title ?? "",
			presentationContent: submission?.content ?? "",
			authors: submission?.authors.length
				? submission.authors.map((a) => ({
						firstName: a.firstName,
						lastName: a.lastName,
						email: a.email,
						affiliationId: a.affiliationId,
						// AffiliationSelect resolves the name from affiliationId on mount
						affiliationName: "",
						isPresenter: a.isPresenter,
					}))
				: [emptyAuthor],
		},
		validators: {
			onChange: formSchema,
			onSubmit: formSchema,
		},
		onSubmit: async ({ value }) => {
			try {
				await saveExhibitorApplicationFn({
					data: {
						companyName: value.companyName,
						description: value.description || undefined,
						website: value.website,
						presentation:
							allowPresentation && value.addPresentation
								? {
										title: value.presentationTitle,
										content: value.presentationContent,
										authors: value.authors,
									}
								: undefined,
					},
				});
				toast.success(
					exhibitor.appliedAt ? "Application updated" : "Application submitted",
				);
				await queryClient.invalidateQueries({
					queryKey: myExhibitorQueryOptions().queryKey,
				});
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to save application",
				);
			}
		},
	});

	const addPresentation = useStore(form.store, (s) => s.values.addPresentation);
	const submissionAttempts = useStore(form.store, (s) => s.submissionAttempts);

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
						{/* Company section */}
						<div className="space-y-4">
							<div className="flex items-center gap-3">
								<IconBuildingStore className="size-5 text-muted-foreground" />
								<h2 className="text-lg font-semibold text-foreground">
									Company details
								</h2>
							</div>

							<div className="space-y-4">
								<form.AppField name="companyName">
									{(field) => (
										<field.InputField
											label="Company name"
											testId="exhibitor-company-name"
										/>
									)}
								</form.AppField>

								<form.AppField name="description">
									{(field) => (
										<field.TextareaField
											label="Description"
											rows={5}
											description="Shown in conference materials"
											testId="exhibitor-description"
										/>
									)}
								</form.AppField>

								<form.AppField name="website">
									{(field) => (
										<field.InputField
											label="Website"
											placeholder="https://example.com"
											testId="exhibitor-website"
										/>
									)}
								</form.AppField>
							</div>
						</div>

						{allowPresentation && (
							<>
								<div className="border-t" />

								{/* Presentation section */}
								<div className="space-y-4">
									<div className="flex items-center gap-3">
										<IconPresentation className="size-5 text-muted-foreground" />
										<h2 className="text-lg font-semibold text-foreground">
											Presentation
										</h2>
									</div>

									<form.AppField name="addPresentation">
										{(field) => (
											<field.SwitchField
												label="Submit a company presentation"
												testId="exhibitor-add-presentation"
											/>
										)}
									</form.AppField>

									{addPresentation && (
										<div className="space-y-4">
											<form.AppField name="presentationTitle">
												{(field) => (
													<field.InputField
														label="Title"
														testId="exhibitor-presentation-title"
													/>
												)}
											</form.AppField>

											<form.AppField name="presentationContent">
												{(field) => (
													<field.TextareaField
														label="Abstract"
														rows={6}
														testId="exhibitor-presentation-content"
													/>
												)}
											</form.AppField>

											<form.Field name="authors">
												{(field) => {
													const hasError =
														(field.state.meta.isBlurred ||
															submissionAttempts > 0) &&
														field.state.meta.errors.length > 0;
													return (
														<Field data-invalid={hasError}>
															<AuthorsInput
																value={field.state.value}
																onChange={field.handleChange}
															/>
															<FieldError
																errors={
																	hasError ? field.state.meta.errors : undefined
																}
															/>
														</Field>
													);
												}}
											</form.Field>
										</div>
									)}
								</div>
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

interface WithdrawExhibitorDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	hasPresentation: boolean;
}

function WithdrawExhibitorDialog({
	open,
	onOpenChange,
	hasPresentation,
}: WithdrawExhibitorDialogProps) {
	const queryClient = useQueryClient();
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleWithdraw = async () => {
		setIsSubmitting(true);
		try {
			await withdrawMyExhibitorFn();
			toast.success("Application withdrawn");
			onOpenChange(false);
			await queryClient.invalidateQueries({
				queryKey: myExhibitorQueryOptions().queryKey,
			});
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Withdraw failed");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Withdraw Application</DialogTitle>
					<DialogDescription>
						Withdraw your exhibitor application from the conference
					</DialogDescription>
				</DialogHeader>

				<Alert variant="destructive">
					<IconAlertTriangle className="size-4" />
					<AlertDescription>
						This will withdraw your exhibitor application.
						{hasPresentation &&
							" Your company presentation will also be withdrawn."}{" "}
						This action cannot be undone — contact the organizer if you change
						your mind.
					</AlertDescription>
				</Alert>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isSubmitting}
					>
						Cancel
					</Button>
					<Button
						variant="destructive"
						data-testid="exhibitor-withdraw-confirm"
						onClick={handleWithdraw}
						disabled={isSubmitting}
					>
						{isSubmitting && (
							<IconLoader2 className="mr-2 size-4 animate-spin" />
						)}
						Withdraw application
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
