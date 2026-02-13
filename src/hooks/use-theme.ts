import { useCallback, useEffect, useSyncExternalStore } from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "nikado-theme";

function getStoredTheme(): Theme {
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored === "light" || stored === "dark" || stored === "system")
		return stored;
	return "system";
}

function resolveTheme(theme: Theme): ResolvedTheme {
	if (theme !== "system") return theme;
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

function syncDomClass(resolved: ResolvedTheme) {
	document.documentElement.classList.toggle("dark", resolved === "dark");
}

let currentTheme = getStoredTheme();
let currentResolved = resolveTheme(currentTheme);
const listeners = new Set<() => void>();

function notify() {
	for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

function getThemeSnapshot() {
	return currentTheme;
}

function getResolvedSnapshot() {
	return currentResolved;
}

const NEXT_THEME: Record<Theme, Theme> = {
	system: "light",
	light: "dark",
	dark: "system",
};

export function cycleTheme() {
	setTheme(NEXT_THEME[currentTheme]);
}

function setTheme(next: Theme) {
	currentTheme = next;
	currentResolved = resolveTheme(next);
	localStorage.setItem(STORAGE_KEY, next);
	syncDomClass(currentResolved);
	notify();
}

export function resetTheme() {
	currentTheme = getStoredTheme();
	currentResolved = resolveTheme(currentTheme);
	syncDomClass(currentResolved);
	notify();
}

export function useTheme() {
	const theme = useSyncExternalStore(subscribe, getThemeSnapshot);
	const resolvedTheme = useSyncExternalStore(subscribe, getResolvedSnapshot);

	useEffect(() => {
		if (theme !== "system") return;

		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		function handleChange() {
			currentResolved = resolveTheme("system");
			syncDomClass(currentResolved);
			notify();
		}
		mediaQuery.addEventListener("change", handleChange);
		return () => {
			mediaQuery.removeEventListener("change", handleChange);
		};
	}, [theme]);

	// Sync DOM on mount (in case React hydrates after the inline script)
	useEffect(() => {
		syncDomClass(resolvedTheme);
	}, [resolvedTheme]);

	return {
		theme,
		resolvedTheme,
		setTheme: useCallback(setTheme, []),
	};
}
