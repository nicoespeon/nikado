import { useGraphStore } from "../store/graph-store";

const BUTTON_CLASS =
	"flex items-center justify-center w-7 h-7 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-sm cursor-pointer disabled:opacity-40 disabled:cursor-default";

export function UndoButton() {
	const canUndo = useGraphStore((s) => s.canUndo);

	return (
		<button
			type="button"
			aria-label="Undo (Ctrl+Z)"
			title="Undo (Ctrl+Z)"
			disabled={!canUndo}
			onClick={() => {
				useGraphStore.getState().undo();
			}}
			className={BUTTON_CLASS}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="14"
				height="14"
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
		</button>
	);
}

export function RedoButton() {
	const canRedo = useGraphStore((s) => s.canRedo);

	return (
		<button
			type="button"
			aria-label="Redo (Ctrl+Shift+Z)"
			title="Redo (Ctrl+Shift+Z)"
			disabled={!canRedo}
			onClick={() => {
				useGraphStore.getState().redo();
			}}
			className={BUTTON_CLASS}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="14"
				height="14"
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
		</button>
	);
}
