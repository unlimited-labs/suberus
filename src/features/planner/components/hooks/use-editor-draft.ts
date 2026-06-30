import { useEffect, useState } from "react";

export function useEditorDraft<T>(initial: T, resetKey: string | null) {
	const [values, setValues] = useState(initial);
	const [dirty, setDirty] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset only when resetKey changes
	useEffect(() => {
		setValues(initial);
		setDirty(false);
	}, [resetKey]);

	return {
		values,
		dirty,
		set: <K extends keyof T>(key: K, value: T[K]) => {
			setValues((prev) => ({ ...prev, [key]: value }));
			setDirty(true);
		},
		reset: () => {
			setValues(initial);
			setDirty(false);
		},
		clearDirty: () => setDirty(false),
	};
}
