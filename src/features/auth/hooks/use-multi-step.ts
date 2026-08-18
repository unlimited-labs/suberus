import { useState } from "react";

interface UseMultiStepOptions {
	totalSteps: number;
	validateStep?: (step: number) => Promise<boolean> | boolean;
}

export function useMultiStep({
	totalSteps,
	validateStep,
}: UseMultiStepOptions) {
	const [currentStep, setCurrentStep] = useState(1);

	const next = async () => {
		if (validateStep) {
			const isValid = await validateStep(currentStep);
			if (!isValid) return false;
		}

		if (currentStep < totalSteps) {
			setCurrentStep((s) => s + 1);
			return true;
		}
		return false;
	};

	const prev = () => {
		if (currentStep > 1) {
			setCurrentStep((s) => s - 1);
		}
	};

	const goTo = (step: number) => {
		if (step >= 1 && step <= totalSteps) {
			setCurrentStep(step);
		}
	};

	return {
		currentStep,
		next,
		prev,
		goTo,
		isFirst: currentStep === 1,
		isLast: currentStep === totalSteps,
	};
}
