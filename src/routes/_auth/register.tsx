import { IconArrowLeft, IconArrowRight, IconLock } from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { AuthCard } from "@/features/auth/components/auth-card";
import { RegisterStep1 } from "@/features/auth/components/register/register-step-1";
import { RegisterStep2 } from "@/features/auth/components/register/register-step-2";
import { RegisterStep3 } from "@/features/auth/components/register/register-step-3";
import { TosModal } from "@/features/auth/components/tos-modal";
import { useRegisterForm } from "@/features/auth/hooks/use-register-form";
import {
	becomeExhibitorFn,
	exhibitorSignupAvailableFn,
} from "@/features/exhibitors/api/exhibitors";
import {
	consumeInvitationFn,
	validateInvitationTokenFn,
} from "@/features/invitations/api/invitations";
import { getRegistrationStatusFn } from "@/features/settings/api/settings";
import {
	acceptTosFn,
	getSurveyQuestionsForRegistrationFn,
	getTosContentForRegistrationFn,
	saveUserSurveyAnswersFn,
} from "@/features/survey/api/survey";
import { Form } from "@/shared/components/composable/form";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

const searchSchema = z.object({
	token: z.string().optional(),
});

export const Route = createFileRoute("/_auth/register")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => ({ token: search.token }),
	loader: async ({ deps }) => {
		const [
			surveyQuestions,
			tosContent,
			registrationStatus,
			exhibitorSignupAvailable,
		] = await Promise.all([
			getSurveyQuestionsForRegistrationFn(),
			getTosContentForRegistrationFn(),
			getRegistrationStatusFn(),
			exhibitorSignupAvailableFn(),
		]);

		let invitation: { email: string; role: string } | null = null;
		if (deps.token) {
			invitation = await validateInvitationTokenFn({
				data: { token: deps.token },
			});
		}

		const registrationClosed = registrationStatus.closed && !invitation;

		return {
			surveyQuestions,
			tosContent,
			invitation,
			token: deps.token,
			registrationClosed,
			exhibitorSignupAvailable,
			contactConsentEnabled: registrationStatus.contactConsentEnabled,
		};
	},
	component: RegisterPage,
});

const STEPS = [
	{ id: 1, title: "Author Information" },
	{ id: 2, title: "Invoice Information" },
	{ id: 3, title: "Survey" },
] as const;

function RegistrationClosedPage() {
	return (
		<AuthCard title="Registration Closed">
			<div className="space-y-4 py-4 text-center">
				<IconLock className="text-muted-foreground/50 mx-auto size-12" />
				<p className="text-muted-foreground">
					Registration is currently closed.
				</p>
				<p className="text-muted-foreground text-sm">
					If you already have an account, you can{" "}
					<Link
						className="text-primary font-medium hover:underline"
						to="/login"
					>
						sign in
					</Link>
					.
				</p>
			</div>
		</AuthCard>
	);
}

function RegisterPage() {
	const { registrationClosed } = Route.useLoaderData();

	if (registrationClosed) {
		return <RegistrationClosedPage />;
	}

	return <RegisterForm />;
}

function RegisterForm() {
	const {
		surveyQuestions,
		tosContent,
		invitation,
		token,
		exhibitorSignupAvailable,
		contactConsentEnabled,
	} = Route.useLoaderData();
	const {
		form,
		visibleQuestions,
		accountType,
		setAccountType,
		tosOpen,
		setTosOpen,
		needInvoice,
		currentStep,
		next,
		prev,
		isFirst,
		isLast,
		handleSubmit,
	} = useRegisterForm({
		surveyQuestions,
		tosContent,
		invitation,
		token,
		effects: {
			consumeInvitation: (t) => consumeInvitationFn({ data: { token: t } }),
			saveSurveyAnswers: async (answers) => {
				await saveUserSurveyAnswersFn({ data: { answers } });
			},
			acceptTos: async () => {
				await acceptTosFn();
			},
			becomeExhibitor: () => becomeExhibitorFn(),
		},
	});

	return (
		<AuthCard
			currentStep={currentStep}
			mobileHeaderExtra={
				<p className="text-muted-foreground text-sm">
					Step {currentStep} of 3: {STEPS[currentStep - 1].title}
				</p>
			}
			steps={STEPS}
			title="Registration"
			wide
		>
			<div className="mb-4 flex gap-2 lg:hidden">
				{STEPS.map((step) => (
					<div
						className={cn(
							"h-1.5 flex-1 rounded-full transition-colors",
							step.id <= currentStep ? "bg-primary" : "bg-muted",
						)}
						key={step.id}
					/>
				))}
			</div>

			<Form className="flex flex-1 flex-col" onSubmit={() => {}}>
				<div className="flex-1 space-y-3">
					{currentStep === 1 && (
						<RegisterStep1
							accountType={accountType}
							exhibitorSignupAvailable={exhibitorSignupAvailable}
							form={form}
							invitation={invitation}
							onAccountTypeChange={setAccountType}
						/>
					)}

					{currentStep === 2 && (
						<RegisterStep2 form={form} needInvoice={needInvoice} />
					)}

					{currentStep === 3 && (
						<RegisterStep3
							contactConsentEnabled={contactConsentEnabled}
							form={form}
							onOpenTos={() => setTosOpen(true)}
							surveyQuestions={visibleQuestions}
							tosContent={tosContent}
						/>
					)}
				</div>

				<div className="mt-4 flex gap-2">
					{!isFirst && (
						<Button
							className="h-9 flex-1"
							onClick={prev}
							type="button"
							variant="outline"
						>
							<IconArrowLeft className="mr-2 size-4" />
							Back
						</Button>
					)}

					{!isLast ? (
						<Button className="h-9 flex-1" onClick={next} type="button">
							Continue
							<IconArrowRight className="ml-2 size-4" />
						</Button>
					) : (
						<form.Subscribe selector={(s) => s.isSubmitting}>
							{(isSubmitting) => (
								<Button
									className="h-9 flex-1"
									disabled={isSubmitting}
									onClick={handleSubmit}
									type="button"
								>
									{isSubmitting ? "Creating account..." : "Create account"}
								</Button>
							)}
						</form.Subscribe>
					)}
				</div>
			</Form>

			<p className="text-muted-foreground mt-3 text-center text-sm">
				Already have an account?{" "}
				<Link className="text-primary font-medium hover:underline" to="/login">
					Sign in
				</Link>
			</p>

			{tosContent && (
				<TosModal
					content={tosContent}
					onOpenChange={setTosOpen}
					open={tosOpen}
				/>
			)}
		</AuthCard>
	);
}
