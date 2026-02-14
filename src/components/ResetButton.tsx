import { useGraphStore } from "../store/graph-store";

export function ResetButton() {
	const isEmpty = useGraphStore((s) => s.goalId === null);

	return (
		<button
			type="button"
			aria-label="New graph (R)"
			title="New graph (R)"
			disabled={isEmpty}
			onClick={() => {
				useGraphStore.getState().reset();
			}}
			className="flex items-center justify-center w-7 h-7 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-sm cursor-pointer disabled:opacity-40 disabled:cursor-default"
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
				<rect width="20" height="5" x="2" y="3" rx="1" />
				<path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
				<path d="M10 12h4" />
			</svg>
		</button>
	);
}
