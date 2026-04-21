import { useEffect, useState } from "react";

export function useEditableTitle(initial: string, resetKey: string | null) {
	const [value, setValue] = useState(initial);
	const [dirty, setDirty] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset only when resetKey changes
	useEffect(() => {
		setValue(initial);
		setDirty(false);
	}, [resetKey]);

	return {
		value,
		dirty,
		set: (next: string) => {
			setValue(next);
			setDirty(true);
		},
		clearDirty: () => setDirty(false),
	};
}
