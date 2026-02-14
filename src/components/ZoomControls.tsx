import { useReactFlow } from "@xyflow/react";

const BUTTON_CLASS =
	"flex items-center justify-center w-7 h-7 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-sm cursor-pointer";

export function ZoomInButton() {
	const { zoomIn } = useReactFlow();

	return (
		<button
			type="button"
			aria-label="Zoom in (+)"
			title="Zoom in (+)"
			onClick={() => {
				void zoomIn({ duration: 200 });
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
				<line x1="12" x2="12" y1="5" y2="19" />
				<line x1="5" x2="19" y1="12" y2="12" />
			</svg>
		</button>
	);
}

export function ZoomOutButton() {
	const { zoomOut } = useReactFlow();

	return (
		<button
			type="button"
			aria-label="Zoom out (-)"
			title="Zoom out (-)"
			onClick={() => {
				void zoomOut({ duration: 200 });
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
				<line x1="5" x2="19" y1="12" y2="12" />
			</svg>
		</button>
	);
}

export function FitViewButton() {
	const { fitView } = useReactFlow();

	return (
		<button
			type="button"
			aria-label="Fit view (0)"
			title="Fit view (0)"
			onClick={() => {
				void fitView({ duration: 200 });
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
				<path d="M15 3h6v6" />
				<path d="M9 21H3v-6" />
				<path d="M21 3l-7 7" />
				<path d="M3 21l7-7" />
			</svg>
		</button>
	);
}
