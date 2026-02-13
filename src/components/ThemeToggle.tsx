import { cycleTheme } from "../hooks/use-theme";

type Theme = "light" | "dark" | "system";

type ThemeToggleProps = {
	theme: Theme;
};

const THEME_ICON: Record<Theme, string> = {
	system: "\u25D1", // ◑ half circle
	light: "\u2600", // ☀ sun
	dark: "\u263E", // ☾ moon
};

const THEME_LABEL: Record<Theme, string> = {
	system: "Theme: system",
	light: "Theme: light",
	dark: "Theme: dark",
};

export function ThemeToggle({ theme }: ThemeToggleProps) {
	return (
		<button
			type="button"
			aria-label={THEME_LABEL[theme]}
			title={THEME_LABEL[theme]}
			onClick={() => {
				cycleTheme();
			}}
			className="flex items-center justify-center w-7 h-7 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-sm cursor-pointer"
		>
			{THEME_ICON[theme]}
		</button>
	);
}
