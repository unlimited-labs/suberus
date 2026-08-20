import { useNavigate } from "@tanstack/react-router";
import { useSelector } from "@tanstack/react-store";
import { useState } from "react";
import { toast } from "sonner";
import { detectCountry } from "@/features/auth/detect-country";
import { useMultiStep } from "@/features/auth/hooks/use-multi-step";
import { registerSchema } from "@/features/auth/validations";
import { getRegistrationStatusFn } from "@/features/settings/api/settings";
import type { SurveyAudience } from "@/generated/prisma/enums";
import type { SurveyQuestionData } from "@/shared/components/survey-question-field";
import { useAppForm } from "@/shared/hooks/use-app-form";
import { signUp } from "@/shared/lib/auth-client";
import { lookup } from "@/shared/lib/lookup";
import { COUNTRIES } from "@/shared/ui/country-combobox";

export type RegisterSurveyQuestions = (SurveyQuestionData & {
	audience: SurveyAudience;
})[];
export type RegisterTosContent = string;

/**
 * Post-signup side effects, injected by the register route (composition tier)
 * so the auth feature does not import survey / exhibitors / invitations APIs.
 */
export interface RegisterEffects {
	consumeInvitation: (token: string) => Promise<{ success: boolean }>;
	saveSurveyAnswers: (
		answers: { questionId: string; value: string }[],
	) => Promise<void>;
	acceptTos: () => Promise<void>;
	becomeExhibitor: () => Promise<void>;
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

const STEP_FIELDS = {
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
} satisfies Record<number, RegisterField[]>;

type RegisterNavigate = (opts: { to: "/" }) => void;

/**
 * Defense-in-depth: invited users bypass the closed gate; everyone else is
 * re-checked against the live registration status right before submit.
 */
async function ensureRegistrationOpen(
	token: string | undefined,
): Promise<boolean> {
	if (token) return true;
	const status = await getRegistrationStatusFn();
	if (status.closed) {
		toast.error("Registration is currently closed");
		return false;
	}
	return true;
}

async function redeemInvitation(
	effects: RegisterEffects,
	token: string,
): Promise<boolean> {
	const applied = await effects
		.consumeInvitation(token)
		.then((result) => result.success)
		.catch(() => false);

	if (!applied) {
		toast.error(
			"Your account was created, but the invitation could not be applied — please contact the organizers",
		);
	}
	return applied;
}

/** Non-blocking: the account already exists, so survey/ToS can be retried in settings. */
async function persistSurveyAndTos(
	surveyAnswers: Record<string, string>,
	tosContent: RegisterTosContent,
	effects: RegisterEffects,
): Promise<void> {
	try {
		const answers = Object.entries(surveyAnswers).map(
			([questionId, value]) => ({
				questionId,
				value,
			}),
		);
		const promises: Promise<void>[] = [effects.saveSurveyAnswers(answers)];
		if (tosContent) promises.push(effects.acceptTos());
		await Promise.all(promises);
	} catch {
		// Account created successfully — survey/ToS can be updated in settings.
	}
}

async function finishRegistration(
	accountType: "participant" | "exhibitor",
	effects: RegisterEffects,
	navigate: RegisterNavigate,
	roleGranted: boolean,
): Promise<void> {
	if (accountType === "exhibitor") {
		try {
			await effects.becomeExhibitor();
			// Full page load so the client session picks up the new role.
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
	// An invited role was just written to the user row; the client session still
	// carries the default one until a full page load.
	if (roleGranted) {
		window.location.assign("/");
		return;
	}
	navigate({ to: "/" });
}

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
	const [detectedCountry] = useState(() => {
		const name = detectCountry();
		return name && COUNTRIES.includes(name) ? name : "";
	});
	const [tosOpen, setTosOpen] = useState(false);

	const visibleQuestions = surveyQuestions.filter(
		(q) =>
			q.audience === "ALL" ||
			q.audience ===
				(accountType === "exhibitor" ? "EXHIBITORS" : "PARTICIPANTS"),
	);

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
			if (!(await ensureRegistrationOpen(token))) return;

			// SAFETY: firstName/title/affiliationId are better-auth additionalFields.
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

			const roleGranted = token
				? await redeemInvitation(effects, token)
				: false;
			const visibleIds = new Set(visibleQuestions.map((q) => q.id));
			const visibleAnswers = Object.fromEntries(
				Object.entries(value.surveyAnswers).filter(([id]) =>
					visibleIds.has(id),
				),
			);
			await persistSurveyAndTos(visibleAnswers, tosContent, effects);
			await finishRegistration(accountType, effects, navigate, roleGranted);
		},
	});

	const needInvoice = useSelector(form.store, (s) => s.values.needInvoice);

	// Run the current step's field-level validators (incl. async email check)
	// and reveal any errors by marking the fields blurred.
	const validateStep = async (step: number): Promise<boolean> => {
		// Step 3 also gates on any required survey questions (dynamic fields).
		// SAFETY: the template literals already have that form; TS widens them to string.
		const surveyFields =
			step === 3
				? visibleQuestions.flatMap((q) =>
						q.isRequired
							? [`surveyAnswers.${q.id}` as `surveyAnswers.${string}`]
							: [],
					)
				: [];
		const fields = [...(lookup(STEP_FIELDS, step) ?? []), ...surveyFields];
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
	};

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
	};
}

export type RegisterFormApi = ReturnType<typeof useRegisterForm>["form"];
