import { useState } from "react";

export function useSubmissionSelection(flatIds: string[]) {
	const [selected, setSelected] = useState<Set<string>>(() => new Set());
	const [lastAnchor, setLastAnchor] = useState<string | null>(null);

	const toggle = (id: string, shift: boolean) => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (shift && lastAnchor) {
				const a = flatIds.indexOf(lastAnchor);
				const b = flatIds.indexOf(id);
				if (a >= 0 && b >= 0) {
					const [from, to] = a < b ? [a, b] : [b, a];
					for (let i = from; i <= to; i++) next.add(flatIds[i]);
					return next;
				}
			}
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
		setLastAnchor(id);
	};

	const clear = () => setSelected(new Set());

	return { selected, toggle, clear };
}
