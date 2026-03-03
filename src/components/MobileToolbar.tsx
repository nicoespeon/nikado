import { useState } from "react";
import { copyMarkdown, useMarkdownCopied } from "../hooks/use-copy-markdown";
import { copyUrl, useCopied } from "../hooks/use-share";
import { cycleTheme, useTheme } from "../hooks/use-theme";
import { useGraphStore } from "../store/graph-store";
import { HelpMenu } from "./HelpMenu";

const ICON_SIZE = 20;
const BUTTON_CLASS =
	"flex flex-col gap-0.5 items-center justify-center min-w-[44px] min-h-[44px] rounded-lg text-gray-700 dark:text-gray-300 active:bg-gray-200 dark:active:bg-gray-700 cursor-pointer disabled:opacity-40 disabled:cursor-default";

function MobileToolbar() {
	const [helpOpen, setHelpOpen] = useState(false);

	return (
		<>
			<div className="fixed top-0 left-0 right-0 z-40 pt-[env(safe-area-inset-top)] bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
				<div className="flex items-center justify-between px-1 py-1">
					<div className="flex items-center">
						<MobileUndoButton />
						<MobileRedoButton />
					</div>
					<div className="flex items-center">
						<MobileShareButton />
						<MobileCopyMarkdownButton />
						<MobileResetButton />
						<MobileThemeToggle />
						<button
							type="button"
							aria-label="Help"
							onClick={() => {
								setHelpOpen(true);
							}}
							className={BUTTON_CLASS}
						>
							<span className="h-5 flex items-center justify-center text-base font-semibold leading-none">
								?
							</span>
							<span className="text-[10px]">Help</span>
						</button>
					</div>
				</div>
			</div>
			{helpOpen && (
				<HelpMenu
					variant="mobile"
					onClose={() => {
						setHelpOpen(false);
					}}
				/>
			)}
		</>
	);
}

function MobileUndoButton() {
	const canUndo = useGraphStore((s) => s.canUndo);

	return (
		<button
			type="button"
			aria-label="Undo"
			disabled={!canUndo}
			onClick={() => {
				useGraphStore.getState().undo();
			}}
			className={BUTTON_CLASS}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width={ICON_SIZE}
				height={ICON_SIZE}
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<path d="M3 7v6h6" />
				<path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
			</svg>
			<span className="text-[10px]">Undo</span>
		</button>
	);
}

function MobileRedoButton() {
	const canRedo = useGraphStore((s) => s.canRedo);

	return (
		<button
			type="button"
			aria-label="Redo"
			disabled={!canRedo}
			onClick={() => {
				useGraphStore.getState().redo();
			}}
			className={BUTTON_CLASS}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width={ICON_SIZE}
				height={ICON_SIZE}
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<path d="M21 7v6h-6" />
				<path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
			</svg>
			<span className="text-[10px]">Redo</span>
		</button>
	);
}

function MobileShareButton() {
	const copied = useCopied();
	const isEmpty = useGraphStore((s) => s.goalId === null);

	return (
		<button
			type="button"
			aria-label={copied ? "Link copied!" : "Share"}
			disabled={isEmpty}
			onClick={copyUrl}
			className={BUTTON_CLASS}
		>
			{copied ? (
				<span className="h-5 flex items-center justify-center text-base leading-none">
					{"\u2713"}
				</span>
			) : (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width={ICON_SIZE}
					height={ICON_SIZE}
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<circle cx="18" cy="5" r="3" />
					<circle cx="6" cy="12" r="3" />
					<circle cx="18" cy="19" r="3" />
					<line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
					<line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
				</svg>
			)}
			<span className="text-[10px]">{copied ? "Link copied!" : "Share"}</span>
		</button>
	);
}

function MobileCopyMarkdownButton() {
	const copied = useMarkdownCopied();
	const isEmpty = useGraphStore((s) => s.goalId === null);

	function handleClick() {
		const { goalId, tasks, dependencies } = useGraphStore.getState();
		copyMarkdown({ goalId, tasks, dependencies });
	}

	return (
		<button
			type="button"
			aria-label={copied ? "Copied as text!" : "Copy as text"}
			disabled={isEmpty}
			onClick={handleClick}
			className={BUTTON_CLASS}
		>
			{copied ? (
				<span className="h-5 flex items-center justify-center text-base leading-none">
					{"\u2713"}
				</span>
			) : (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width={ICON_SIZE}
					height={ICON_SIZE}
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path d="M14 3v4a1 1 0 0 0 1 1h4" />
					<path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
					<path d="M9 17h6" />
					<path d="M9 13h6" />
				</svg>
			)}
			<span className="text-[10px]">{copied ? "Copied as text!" : "Copy"}</span>
		</button>
	);
}

function MobileResetButton() {
	const isEmpty = useGraphStore((s) => s.goalId === null);

	return (
		<button
			type="button"
			aria-label="Reset"
			disabled={isEmpty}
			onClick={() => {
				useGraphStore.getState().reset();
			}}
			className={BUTTON_CLASS}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width={ICON_SIZE}
				height={ICON_SIZE}
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<rect width="20" height="5" x="2" y="3" rx="1" />
				<path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
				<path d="M10 12h4" />
			</svg>
			<span className="text-[10px]">Reset</span>
		</button>
	);
}

function MobileThemeToggle() {
	const { theme } = useTheme();

	const THEME_ICON: Record<string, string> = {
		system: "\u25D1",
		light: "\u2600",
		dark: "\u263E",
	};

	const THEME_DISPLAY: Record<string, string> = {
		system: "Auto",
		light: "Light",
		dark: "Dark",
	};

	return (
		<button
			type="button"
			aria-label={`Theme: ${theme}`}
			onClick={() => {
				cycleTheme();
			}}
			className={BUTTON_CLASS}
		>
			<span className="h-5 flex items-center justify-center text-base leading-none">
				{THEME_ICON[theme]}
			</span>
			<span className="text-[10px]">{THEME_DISPLAY[theme]}</span>
		</button>
	);
}

export { MobileToolbar };
