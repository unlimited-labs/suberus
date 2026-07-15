// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { signUp } from "@/shared/lib/auth-client";
import { type RegisterEffects, useRegisterForm } from "./use-register-form";

const navigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => navigate,
}));

vi.mock("sonner", () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/features/auth/detect-country", () => ({
	detectCountry: () => "",
}));

const getRegistrationStatusFn = vi.fn();
vi.mock("@/features/settings/api/settings", () => ({
	getRegistrationStatusFn: () => getRegistrationStatusFn(),
}));

vi.mock("@/shared/lib/auth-client", () => ({
	signUp: { email: vi.fn() },
}));

const mockSignUpEmail = vi.mocked(signUp.email);

function effects(): RegisterEffects {
	return {
		consumeInvitation: vi.fn().mockResolvedValue({ success: true }),
		saveSurveyAnswers: vi.fn().mockResolvedValue(undefined),
		acceptTos: vi.fn().mockResolvedValue(undefined),
		becomeExhibitor: vi.fn().mockResolvedValue(undefined),
	};
}

function render(
	overrides: Partial<Parameters<typeof useRegisterForm>[0]> = {},
) {
	const eff = overrides.effects ?? effects();
	const view = renderHook(() =>
		useRegisterForm({
			surveyQuestions: [],
			tosContent: "",
			invitation: null,
			token: undefined,
			...overrides,
			effects: eff,
		}),
	);
	return { ...view, effects: eff };
}

/** Fill the form with values that satisfy registerSchema. */
function fillValid(
	form: ReturnType<typeof render>["result"]["current"]["form"],
) {
	form.setFieldValue("email", "ada@example.com");
	form.setFieldValue("password", "supersecret1");
	form.setFieldValue("confirmPassword", "supersecret1");
	form.setFieldValue("firstName", "Ada");
	form.setFieldValue("lastName", "Lovelace");
	form.setFieldValue("affiliationId", "aff-1");
	form.setFieldValue("country", "Poland");
	form.setFieldValue("acceptTerms", true);
}

describe("useRegisterForm", () => {
	beforeEach(() => {
		navigate.mockReset();
		getRegistrationStatusFn.mockReset();
		getRegistrationStatusFn.mockResolvedValue({ closed: false });
		mockSignUpEmail.mockReset();
		mockSignUpEmail.mockResolvedValue({ error: null } as Awaited<
			ReturnType<typeof signUp.email>
		>);
	});

	it("exposes initial multi-step state and seeds email from an invitation", () => {
		const { result } = render({
			invitation: { email: "invited@example.com", role: "AUTHOR" },
		});

		expect(result.current.currentStep).toBe(1);
		expect(result.current.isFirst).toBe(true);
		expect(result.current.accountType).toBe("participant");
		expect(result.current.form.state.values.email).toBe("invited@example.com");
	});

	it("toggles account type and ToS dialog", () => {
		const { result } = render();

		act(() => result.current.setAccountType("exhibitor"));
		act(() => result.current.setTosOpen(true));

		expect(result.current.accountType).toBe("exhibitor");
		expect(result.current.tosOpen).toBe(true);
	});

	it("signs up, persists survey/ToS, and navigates home on the happy path", async () => {
		const { result, effects: eff } = render({ tosContent: "Terms…" });

		act(() => fillValid(result.current.form));
		await act(async () => {
			await result.current.form.handleSubmit();
		});

		expect(mockSignUpEmail).toHaveBeenCalledOnce();
		expect(eff.saveSurveyAnswers).toHaveBeenCalledOnce();
		expect(eff.acceptTos).toHaveBeenCalledOnce();
		await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: "/" }));
	});

	it("aborts when registration is closed and no invitation token is present", async () => {
		getRegistrationStatusFn.mockResolvedValue({ closed: true });
		const { result } = render();

		act(() => fillValid(result.current.form));
		await act(async () => {
			await result.current.form.handleSubmit();
		});

		expect(mockSignUpEmail).not.toHaveBeenCalled();
		expect(navigate).not.toHaveBeenCalled();
	});

	it("skips the closed-registration check when an invitation token is present", async () => {
		const { result, effects: eff } = render({ token: "inv-token" });

		act(() => fillValid(result.current.form));
		await act(async () => {
			await result.current.form.handleSubmit();
		});

		expect(getRegistrationStatusFn).not.toHaveBeenCalled();
		expect(eff.consumeInvitation).toHaveBeenCalledWith("inv-token");
		expect(mockSignUpEmail).toHaveBeenCalledOnce();
	});

	it("does not navigate when sign-up returns an error", async () => {
		mockSignUpEmail.mockResolvedValue({
			error: { message: "Email already registered" },
		} as Awaited<ReturnType<typeof signUp.email>>);
		const { result, effects: eff } = render();

		act(() => fillValid(result.current.form));
		await act(async () => {
			await result.current.form.handleSubmit();
		});

		expect(eff.saveSurveyAnswers).not.toHaveBeenCalled();
		expect(navigate).not.toHaveBeenCalled();
	});

	it("becomes an exhibitor and redirects to the exhibitor panel", async () => {
		const assign = vi.fn();
		Object.defineProperty(window, "location", {
			configurable: true,
			value: { assign },
		});
		const { result, effects: eff } = render();

		act(() => {
			result.current.setAccountType("exhibitor");
			fillValid(result.current.form);
		});
		await act(async () => {
			await result.current.form.handleSubmit();
		});

		await waitFor(() => expect(eff.becomeExhibitor).toHaveBeenCalledOnce());
		expect(assign).toHaveBeenCalledWith("/exhibitor");
		expect(navigate).not.toHaveBeenCalled();
	});
});
