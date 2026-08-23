import { useRouter } from "@tanstack/react-router";
import { createContext, type ReactNode, useContext, useEffect } from "react";
import { toast } from "sonner";
import type { Theme } from "@/shared/lib/theme";
import { setThemeFn } from "@/shared/lib/theme";

interface ThemeContextValue {
	theme: Theme;
	setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveAndApply(theme: Theme) {
	const dark =
		theme === "dark" ||
		(theme === "system" &&
			window.matchMedia("(prefers-color-scheme: dark)").matches);
	document.documentElement.classList.toggle("dark", dark);
}

export function ThemeProvider({
	theme,
	children,
}: {
	theme: Theme;
	children: ReactNode;
}) {
	const router = useRouter();

	useEffect(() => {
		resolveAndApply(theme);

		if (theme !== "system") return;

		const mql = window.matchMedia("(prefers-color-scheme: dark)");
		const onChange = () => resolveAndApply("system");
		mql.addEventListener("change", onChange);
		return () => mql.removeEventListener("change", onChange);
	}, [theme]);

	const setTheme = (newTheme: Theme) => {
		resolveAndApply(newTheme);
		setThemeFn({ data: newTheme })
			.then(() => router.invalidate())
			.catch(() => {
				toast.error("Could not save your theme preference");
			});
	};

	return <ThemeContext value={{ theme, setTheme }}>{children}</ThemeContext>;
}

export function useTheme(): ThemeContextValue {
	const ctx = useContext(ThemeContext);
	if (!ctx) {
		throw new Error("useTheme must be used within ThemeProvider");
	}
	return ctx;
}
