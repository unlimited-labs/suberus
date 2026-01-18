import { useCallback, useSyncExternalStore } from "react"

type Theme = "light" | "dark" | "system"

const STORAGE_KEY = "suberus-theme"

function getTheme(): Theme {
	if (typeof window === "undefined") return "system"
	return (localStorage.getItem(STORAGE_KEY) as Theme) ?? "system"
}

function applyTheme(theme: Theme) {
	const dark = theme === "dark" ||
		(theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
	document.documentElement.classList.toggle("dark", dark)
}

function subscribe(callback: () => void) {
	const handler = (e: StorageEvent) => {
		if (e.key === STORAGE_KEY) callback()
	}
	window.addEventListener("storage", handler)
	return () => window.removeEventListener("storage", handler)
}

export function useTheme() {
	const theme = useSyncExternalStore(subscribe, getTheme, () => "system" as Theme)

	const setTheme = useCallback((newTheme: Theme) => {
		localStorage.setItem(STORAGE_KEY, newTheme)
		applyTheme(newTheme)
		window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }))
	}, [])

	return { theme, setTheme }
}
