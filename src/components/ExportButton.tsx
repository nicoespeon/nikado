import { useReactFlow } from "@xyflow/react";
import { useGraphStore } from "../store/graph-store";
import { exportGraphAsImage } from "./export-image";

export function ExportButton() {
	const goalId = useGraphStore((s) => s.goalId);
	const goalLabel = useGraphStore(
		(s) => s.tasks.find((t) => t.id === s.goalId)?.label,
	);
	const { fitView } = useReactFlow();

	return (
		<button
			type="button"
			aria-label="Export as image (X)"
			title="Export as image (X)"
			disabled={goalId === null}
			onClick={() => {
				void exportGraphAsImage({ fitView, goalLabel });
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
				<path d="M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10l-3.1-3.1a2 2 0 0 0-2.814.014L6 21" />
				<path d="m14 19 3 3v-5.5" />
				<path d="m17 22 3-3" />
				<circle cx="9" cy="9" r="2" />
			</svg>
		</button>
	);
}
