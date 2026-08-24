import { useId } from "react";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

const CONFIRM_PHRASE = "UNDERSTOOD";

export function isConfirmPhrase(value: string): boolean {
	return value.trim() === CONFIRM_PHRASE;
}

interface ConfirmPhraseFieldProps {
	value: string;
	onChange: (value: string) => void;
	testId: string;
}

export function ConfirmPhraseField({
	value,
	onChange,
	testId,
}: ConfirmPhraseFieldProps) {
	const inputId = useId();

	return (
		<div className="space-y-1.5">
			<Label htmlFor={inputId}>Type {CONFIRM_PHRASE} to confirm</Label>
			<Input
				autoComplete="off"
				data-testid={testId}
				id={inputId}
				onChange={(e) => onChange(e.target.value)}
				placeholder={CONFIRM_PHRASE}
				value={value}
			/>
		</div>
	);
}
