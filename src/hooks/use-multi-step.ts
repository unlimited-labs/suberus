import { useCallback, useMemo, useState } from "react";

interface UseMultiStepOptions {
	totalSteps: number;
	validateStep?: (step: number) => Promise<boolean> | boolean;
}

export function useMultiStep({
	totalSteps,
	validateStep,
}: UseMultiStepOptions) {
	const [currentStep, setCurrentStep] = useState(1);
	const [validationAttempted, setValidationAttempted] = useState<
		Record<number, boolean>
	>({});

	const isValidationAttempted = useMemo(
		() => validationAttempted[currentStep] ?? false,
		[validationAttempted, currentStep],
	);

	const next = useCallback(async () => {
		setValidationAttempted((prev) => ({ ...prev, [currentStep]: true }));

		if (validateStep) {
			const isValid = await validateStep(currentStep);
			if (!isValid) return false;
		}

		if (currentStep < totalSteps) {
			setCurrentStep((s) => s + 1);
			return true;
		}
		return false;
	}, [currentStep, totalSteps, validateStep]);

	const prev = useCallback(() => {
		if (currentStep > 1) {
			setCurrentStep((s) => s - 1);
		}
	}, [currentStep]);

	const goTo = useCallback(
		(step: number) => {
			if (step >= 1 && step <= totalSteps) {
				setCurrentStep(step);
			}
		},
		[totalSteps],
	);

	const markValidationAttempted = useCallback(
		(step?: number) => {
			const targetStep = step ?? currentStep;
			setValidationAttempted((prev) => ({ ...prev, [targetStep]: true }));
		},
		[currentStep],
	);

	return {
		currentStep,
		next,
		prev,
		goTo,
		isFirst: currentStep === 1,
		isLast: currentStep === totalSteps,
		isValidationAttempted,
		validationAttempted,
		markValidationAttempted,
	};
}
