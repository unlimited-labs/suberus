import { useNavigate } from "@tanstack/react-router";
import { useSelector } from "@tanstack/react-store";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { detectCountry } from "@/features/auth/detect-country";
import { useMultiStep } from "@/features/auth/hooks/use-multi-step";
import { registerSchema } from "@/features/auth/validations";
import { getRegistrationStatusFn } from "@/features/settings/api/settings";
import type { SurveyQuestionData } from "@/shared/components/survey-question-field";
import { useAppForm } from "@/shared/hooks/use-app-form";
import { signUp } from "@/shared/lib/auth-client";
import { COUNTRIES } from "@/shared/ui/country-combobox";

export type RegisterSurveyQuestions = SurveyQuestionData[];
export type RegisterTosContent = string;

/**
 * Post-signup side effects, injected by the register route (composition tier)
 * so the auth feature does not import survey / exhibitors / invitations APIs.
 */
export interface RegisterEffects {
	consumeInvitation: (token: string) => Promise<unknown>;
	saveSurveyAnswers: (
		answers: { questionId: string; value: string }[],
	) => Promise<unknown>;
	acceptTos: () => Promise<unknown>;
	becomeExhibitor: () => Promise<unknown>;
}

interface UseRegisterFormArgs {
	surveyQuestions: RegisterSurveyQuestions;
	tosContent: RegisterTosContent;
	invitation: { email: string; role: string } | null;
	token: string | undefined;
	effects: RegisterEffects;
}

type RegisterField =
	| "email"
	| "password"
	| "confirmPassword"
	| "firstName"
	| "lastName"
	| "affiliationId"
	| "address"
	| "country"
	| "acceptTerms";

const STEP_FIELDS: Record<number, RegisterField[]> = {
	1: [
		"email",
		"password",
		"confirmPassword",
		"firstName",
		"lastName",
		"affiliationId",
	],
	2: ["address", "country"],
	3: ["acceptTerms"],
};

/**
 * Owns the multi-step registration form: form instance, account-type and ToS
 * dialog state, per-step validation (incl. async email + dynamic survey fields),
 * step navigation and the sign-up / invitation / survey / exhibitor submit flow.
 */
export function useRegisterForm({
	surveyQuestions,
	tosContent,
	invitation,
	token,
	effects,
}: UseRegisterFormArgs) {
	const navigate = useNavigate();
	const [accountType, setAccountType] = useState<"participant" | "exhibitor">(
		"participant",
	);
	const detectedCountry = useMemo(() => {
		const name = detectCountry();
		return name && COUNTRIES.includes(name) ? name : "";
	}, []);
	const [tosOpen, setTosOpen] = useState(false);

	const defaultSurveyAnswers: Record<string, string> = {};
	for (const q of surveyQuestions) {
		defaultSurveyAnswers[q.id] = q.type === "CHECKBOX" ? "false" : "";
	}

	const form = useAppForm({
		defaultValues: {
			email: invitation?.email ?? "",
			password: "",
			confirmPassword: "",
			title: "",
			firstName: "",
			lastName: "",
			affiliationId: "",
			affiliationName: "",
			needInvoice: true,
			address: "",
			country: detectedCountry,
			surveyAnswers: defaultSurveyAnswers,
			acceptTerms: !tosContent,
		},
		// Full-form safety net; live + per-step checks are field-level validators.
		validators: {
			onSubmit: registerSchema,
		},
		onSubmit: async ({ value }) => {
			// Defense-in-depth: re-check registration status before submit
			if (!token) {
				const status = await getRegistrationStatusFn();
				if (status.closed) {
					toast.error("Registration is currently closed");
					return;
				}
			}

			const result = await signUp.email({
				email: value.email,
				password: value.password,
				name: value.lastName,
				firstName: value.firstName,
				title: value.title || undefined,
				affiliationId: value.affiliationId || undefined,
				needInvoice: value.needInvoice,
				address: value.address || undefined,
				country: value.country || undefined,
			} as Parameters<typeof signUp.email>[0]);

			if (result.error) {
				toast.error(result.error.message ?? "Registration failed");
				return;
			}

			// Consume invitation token if present
			if (token) {
				try {
					await effects.consumeInvitation(token);
				} catch {
					// Invitation may have already been consumed - not critical
				}
			}

			// Save survey answers + ToS acceptance (non-blocking)
			try {
				const promises: Promise<unknown>[] = [];
				const answers = Object.entries(value.surveyAnswers).map(
					([questionId, val]) => ({ questionId, value: val }),
				);
				promises.push(effects.saveSurveyAnswers(answers));
				if (tosContent) promises.push(effects.acceptTos());
				await Promise.all(promises);
			} catch {
				// Account created successfully — survey/ToS can be updated in settings
			}

			if (accountType === "exhibitor") {
				try {
					await effects.becomeExhibitor();
					// Full page load so the client session picks up the new role
					window.location.assign("/exhibitor");
					return;
				} catch {
					toast.error(
						"Could not register as exhibitor — your account was created as a regular participant",
					);
					navigate({ to: "/" });
					return;
				}
			}

			toast.success("Account created! Check your email to verify.");
			navigate({ to: "/" });
		},
	});

	const needInvoice = useSelector(form.store, (s) => s.values.needInvoice);

	// Run the current step's field-level validators (incl. async email check)
	// and reveal any errors by marking the fields blurred.
	const validateStep = useCallback(
		async (step: number): Promise<boolean> => {
			// Step 3 also gates on any required survey questions (dynamic fields).
			const surveyFields =
				step === 3
					? surveyQuestions
							.filter((q) => q.isRequired)
							.map((q) => `surveyAnswers.${q.id}` as `surveyAnswers.${string}`)
					: [];
			const fields = [...(STEP_FIELDS[step] ?? []), ...surveyFields];
			const results = await Promise.all(
				fields.map((field) => form.validateField(field, "change")),
			);
			const ok = results.every((errors) => errors.length === 0);
			if (!ok) {
				for (const field of fields) {
					form.setFieldMeta(field, (prev) => ({ ...prev, isBlurred: true }));
				}
			}
			return ok;
		},
		[form, surveyQuestions],
	);

	const { currentStep, next, prev, isFirst, isLast } = useMultiStep({
		totalSteps: 3,
		validateStep,
	});

	const handleSubmit = async () => {
		const isValid = await validateStep(3);
		if (isValid) {
			await form.handleSubmit();
		}
	};

	return {
		form,
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
	};
}

export type RegisterFormApi = ReturnType<typeof useRegisterForm>["form"];
