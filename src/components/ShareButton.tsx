import { copyUrl, useCopied } from "../hooks/use-share";
import { useGraphStore } from "../store/graph-store";

export function ShareButton() {
	const copied = useCopied();
	const isEmpty = useGraphStore((s) => s.goalId === null);
	const label = copied ? "Link copied!" : "Share (S)";

	return (
		<div className="relative">
			<button
				type="button"
				aria-label={label}
				title={label}
				disabled={isEmpty}
				onClick={copyUrl}
				className="flex items-center justify-center w-7 h-7 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-sm cursor-pointer disabled:opacity-40 disabled:cursor-default"
			>
				{copied ? (
					"\u2713"
				) : (
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
						<circle cx="18" cy="5" r="3" />
						<circle cx="6" cy="12" r="3" />
						<circle cx="18" cy="19" r="3" />
						<line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
						<line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
					</svg>
				)}
			</button>
			{copied && (
				<span className="absolute right-0 top-full mt-1 whitespace-nowrap rounded bg-gray-800 dark:bg-gray-200 px-2 py-1 text-xs text-white dark:text-gray-800 shadow">
					Link copied!
				</span>
			)}
		</div>
	);
}
