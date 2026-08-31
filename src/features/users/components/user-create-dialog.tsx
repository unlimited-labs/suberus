import { IconBuilding, IconMail } from "@tabler/icons-react";
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { checkEmailAvailableFn } from "@/features/auth/api/auth";
import { adminSurveyQuestionsQueryOptions } from "@/features/survey/api/survey";
import {
	adminUsersQueryOptions,
	createAdminUser,
} from "@/features/users/api/users";
import type { AdminUserCreateFormData } from "@/features/users/validations";
import { adminUserCreateSchema } from "@/features/users/validations";
import { BillingFieldsGroup } from "@/shared/components/composable/billing-fields-group";
import { Form } from "@/shared/components/composable/form";
import { SurveyQuestionField } from "@/shared/components/survey-question-field";
import { useAppForm } from "@/shared/hooks/use-app-form";
import { getErrorMessage } from "@/shared/lib/error-message";
import { titleOptions } from "@/shared/lib/labels/title";
import { surveyAnswerRequiredError } from "@/shared/lib/validations/survey";
import { Button } from "@/shared/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";
import { Field, FieldError } from "@/shared/ui/field";

interface UserCreateDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function UserCreateDialog({
	open,
	onOpenChange,
}: UserCreateDialogProps) {
	const queryClient = useQueryClient();
	const { data: allQuestions } = useSuspenseQuery(
		adminSurveyQuestionsQueryOptions(),
	);

	const questions = allQuestions.filter(
		(q) =>
			q.isActive && (q.audience === "ALL" || q.audience === "PARTICIPANTS"),
	);

	const defaultValues: AdminUserCreateFormData = {
		firstName: "",
		lastName: "",
		title: "",
		affiliation: "",
		email: "",
		needInvoice: false,
		address: "",
		country: "",
		surveyAnswers: Object.fromEntries(
			questions.map((q) => [q.id, q.type === "CHECKBOX" ? "false" : ""]),
		),
	};

	const mutation = useMutation({
		mutationFn: (value: AdminUserCreateFormData) =>
			createAdminUser({
				data: {
					email: value.email,
					firstName: value.firstName,
					lastName: value.lastName,
					title: value.title || undefined,
					affiliation: value.affiliation || undefined,
					needInvoice: value.needInvoice,
					address: value.address,
					country: value.country,
					answers: Object.entries(value.surveyAnswers).map(
						([questionId, answer]) => ({ questionId, value: answer }),
					),
				},
			}),
		onSuccess: ({ emailSent }) => {
			queryClient.invalidateQueries({
				queryKey: adminUsersQueryOptions().queryKey,
			});
			close();
			if (emailSent) {
				toast.success("User created — a set-password email has been sent");
			} else {
				toast.warning(
					"User created, but the set-password email could not be sent — check SMTP and that the “Account Created by Organizer” template is enabled, then resend it from the user's page",
				);
			}
		},
		onError: (error) => {
			toast.error(getErrorMessage(error, "Failed to create user"));
		},
	});

	const form = useAppForm({
		defaultValues,
		validators: {
			onChange: adminUserCreateSchema,
			onSubmit: adminUserCreateSchema,
			// A 409 thrown by the server fn resolves rather than rejects on the
			// client, so email conflicts are pre-checked here (same as register).
			onSubmitAsync: async ({ value }) => {
				const { available } = await checkEmailAvailableFn({
					data: { email: value.email },
				});
				if (!available) {
					return { fields: { email: "Email already in use" } };
				}
				await mutation.mutateAsync(value);
				return null;
			},
		},
	});

	function close() {
		form.reset();
		onOpenChange(false);
	}

	return (
		<Dialog
			onOpenChange={(next) => (next ? onOpenChange(true) : close())}
			open={open}
		>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Add User</DialogTitle>
					<DialogDescription>
						Creates an active participant account and emails a link to set the
						password.
					</DialogDescription>
				</DialogHeader>
				<Form
					className="space-y-4"
					data-testid="user-create-form"
					onSubmit={() => {
						void form.handleSubmit();
					}}
				>
					<div className="grid gap-4 sm:grid-cols-2">
						<form.AppField name="firstName">
							{(field) => <field.InputField label="First name *" />}
						</form.AppField>
						<form.AppField name="lastName">
							{(field) => <field.InputField label="Last name *" />}
						</form.AppField>
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<form.AppField name="title">
							{(field) => (
								<field.SelectField
									label="Title"
									options={titleOptions}
									placeholder="—"
								/>
							)}
						</form.AppField>
						<form.AppField name="affiliation">
							{(field) => (
								<field.IconInputField
									icon={<IconBuilding className="size-4" />}
									label="Affiliation"
								/>
							)}
						</form.AppField>
					</div>

					<form.AppField name="email">
						{(field) => (
							<field.IconInputField
								icon={<IconMail className="size-4" />}
								label="Email *"
								type="email"
							/>
						)}
					</form.AppField>

					<BillingFieldsGroup
						fields={{
							needInvoice: "needInvoice",
							address: "address",
							country: "country",
						}}
						form={form}
						needInvoiceLabel="Needs invoice for organization"
					/>

					{questions.length > 0 && (
						<div className="space-y-3 border-t pt-4">
							{questions.map((question) => (
								<form.Field
									key={question.id}
									name={`surveyAnswers.${question.id}`}
									validators={{
										onChange: ({ value }) =>
											surveyAnswerRequiredError(question, value),
										onSubmit: ({ value }) =>
											surveyAnswerRequiredError(question, value),
									}}
								>
									{(field) => {
										const hasError =
											field.form.state.submissionAttempts > 0 &&
											field.state.meta.errors.length > 0;
										return (
											<Field data-invalid={hasError}>
												<SurveyQuestionField
													onChange={field.handleChange}
													question={question}
													value={field.state.value}
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
							))}
						</div>
					)}

					<DialogFooter>
						<Button onClick={close} type="button" variant="outline">
							Cancel
						</Button>
						<form.AppForm>
							<form.SubmitButton
								disabled={mutation.isPending}
								label="Create user"
								submittingLabel="Creating..."
							/>
						</form.AppForm>
					</DialogFooter>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
