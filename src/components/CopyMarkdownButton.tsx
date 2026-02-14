import { copyMarkdown, useMarkdownCopied } from "../hooks/use-copy-markdown";
import { useGraphStore } from "../store/graph-store";

export function CopyMarkdownButton() {
	const copied = useMarkdownCopied();
	const isEmpty = useGraphStore((s) => s.goalId === null);
	const label = copied ? "Copied as text!" : "Copy as text (C)";

	function handleClick() {
		const { goalId, tasks, dependencies } = useGraphStore.getState();
		copyMarkdown({ goalId, tasks, dependencies });
	}

	return (
		<div className="relative">
			<button
				type="button"
				aria-label={label}
				title={label}
				disabled={isEmpty}
				onClick={handleClick}
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
						<path d="M14 3v4a1 1 0 0 0 1 1h4" />
						<path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
						<path d="M9 17h6" />
						<path d="M9 13h6" />
					</svg>
				)}
			</button>
			{copied && (
				<span className="absolute right-0 top-full mt-1 whitespace-nowrap rounded bg-gray-800 dark:bg-gray-200 px-2 py-1 text-xs text-white dark:text-gray-800 shadow">
					Copied as text!
				</span>
			)}
		</div>
	);
}
