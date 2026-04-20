import { useState } from "react";

export function useToggleSet<T>(initial?: Iterable<T>) {
	const [set, setSet] = useState<Set<T>>(() => new Set(initial));

	const toggle = (key: T) =>
		setSet((prev) => {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});

	const clear = () => setSet(new Set());
	const replace = (values: Iterable<T>) => setSet(new Set(values));

	return { set, toggle, clear, replace, setSet };
}
