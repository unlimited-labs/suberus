import { toast } from "sonner";

export function useMutationRun(invalidate: () => void) {
	return async <T>(
		fn: () => Promise<T>,
		errorMsg: string,
	): Promise<T | null> => {
		try {
			const result = await fn();
			invalidate();
			return result;
		} catch (e) {
			toast.error(e instanceof Error ? e.message : errorMsg);
			return null;
		}
	};
}
