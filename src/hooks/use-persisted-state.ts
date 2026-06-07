import {
	type Dispatch,
	type SetStateAction,
	useEffect,
	useRef,
	useState,
} from "react";

interface PersistedStateOptions<T> {
	/** Reconcile the stored value with the current default, e.g. to keep keys added after the value was last saved. */
	merge?: (stored: T, fallback: T) => T;
}

/**
 * useState that mirrors its value to localStorage under `key`.
 * SSR-safe: server and first client render use `defaultValue`, then the stored
 * value is applied in an effect to avoid hydration mismatch. When `key` is
 * undefined the hook behaves like a plain useState (no storage I/O).
 */
export function usePersistedState<T>(
	key: string | undefined,
	defaultValue: T,
	options?: PersistedStateOptions<T>,
): [T, Dispatch<SetStateAction<T>>] {
	const [value, setValue] = useState<T>(defaultValue);

	const defaultRef = useRef(defaultValue);
	const mergeRef = useRef(options?.merge);
	mergeRef.current = options?.merge;
	const hydrated = useRef(false);

	useEffect(() => {
		if (!key) return;
		try {
			const raw = window.localStorage.getItem(key);
			if (raw === null) return;
			const stored = JSON.parse(raw) as T;
			const merge = mergeRef.current;
			setValue(merge ? merge(stored, defaultRef.current) : stored);
		} catch {
			// localStorage unavailable (private mode) or malformed JSON — keep default
		}
	}, [key]);

	useEffect(() => {
		if (!key) return;
		// Skip the initial run so we don't overwrite the stored value with the
		// default before the restore effect has applied it.
		if (!hydrated.current) {
			hydrated.current = true;
			return;
		}
		try {
			window.localStorage.setItem(key, JSON.stringify(value));
		} catch {
			// localStorage unavailable — ignore
		}
	}, [key, value]);

	return [value, setValue];
}
