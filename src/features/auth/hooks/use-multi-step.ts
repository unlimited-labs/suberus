import { useRef, useState } from "react";

interface UseMultiStepOptions {
	totalSteps: number;
	validateStep?: (step: number) => Promise<boolean> | boolean;
}

export function useMultiStep({
	totalSteps,
	validateStep,
}: UseMultiStepOptions) {
	const [currentStep, setCurrentStep] = useState(1);

	const advancing = useRef(false);

	// Enter auto-repeat fires several submits while the async validation is pending.
	const next = async () => {
		if (advancing.current) return false;
		advancing.current = true;
		const valid = await Promise.resolve(
			validateStep ? validateStep(currentStep) : true,
		).finally(() => {
			advancing.current = false;
		});
		if (!valid || currentStep >= totalSteps) return false;
		setCurrentStep((s) => Math.min(s + 1, totalSteps));
		return true;
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
