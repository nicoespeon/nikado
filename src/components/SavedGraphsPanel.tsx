import { useEffect, useRef, useState } from "react";
import { graphName, isGoalDone, type SavedGraphId } from "../model/saved-graph";
import { useSavedGraphsStore } from "../store/saved-graphs-store";

type SavedGraphsPanelProps = {
	expanded: boolean;
	onToggle: () => void;
};

function SavedGraphsPanel({ expanded, onToggle }: SavedGraphsPanelProps) {
	const graphs = useSavedGraphsStore((s) => s.graphs);
	const activeGraphId = useSavedGraphsStore((s) => s.activeGraphId);
	const [focusedIndex, setFocusedIndex] = useState(0);
	const panelRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (expanded) {
			setFocusedIndex(0);
			panelRef.current?.focus();
		}
	}, [expanded]);

	if (!expanded) {
		return (
			<button
				type="button"
				aria-label="Saved graphs (L)"
				title="Saved graphs (L)"
				onClick={onToggle}
				className="flex items-center justify-center h-9 px-3 rounded-full border shadow-sm text-xs font-semibold cursor-pointer bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400"
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
					className="mr-1.5"
				>
					<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
				</svg>
				{graphs.length > 0 ? graphs.length : ""}
			</button>
		);
	}

	function handleKeyDown(e: React.KeyboardEvent) {
		if (graphs.length === 0) return;

		if (e.key === "ArrowDown") {
			e.preventDefault();
			e.stopPropagation();
			setFocusedIndex((i) => (i + 1) % graphs.length);
			return;
		}

		if (e.key === "ArrowUp") {
			e.preventDefault();
			e.stopPropagation();
			setFocusedIndex((i) => (i - 1 + graphs.length) % graphs.length);
			return;
		}

		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			e.stopPropagation();
			useSavedGraphsStore.getState().loadGraph(graphs[focusedIndex].id);
			onToggle();
			return;
		}

		if (e.key === "Backspace" || e.key === "Delete") {
			e.preventDefault();
			e.stopPropagation();
			useSavedGraphsStore.getState().deleteGraph(graphs[focusedIndex].id);
			setFocusedIndex((i) => Math.min(i, graphs.length - 2));
		}
	}

	return (
		<div
			ref={panelRef}
			tabIndex={-1}
			onKeyDown={handleKeyDown}
			className="w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm overflow-hidden outline-none"
		>
			<div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-700">
				<span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
					Saved Graphs
				</span>
				<button
					type="button"
					aria-label="Close saved graphs panel"
					onClick={onToggle}
					className="flex items-center justify-center w-5 h-5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-pointer text-xs"
				>
					&#x2715;
				</button>
			</div>

			<div className="max-h-60 overflow-y-auto">
				{graphs.length === 0 && (
					<p className="px-3 py-3 text-xs text-gray-400 dark:text-gray-500">
						No saved graphs yet. Create a goal to get started.
					</p>
				)}
				{graphs.map((g, index) => (
					<GraphItem
						key={g.id}
						id={g.id}
						name={graphName(g)}
						isDone={isGoalDone(g)}
						isActive={g.id === activeGraphId}
						isFocused={index === focusedIndex}
						onSelect={onToggle}
					/>
				))}
			</div>

			<div className="border-t border-gray-100 dark:border-gray-700 px-3 py-2">
				<button
					type="button"
					onClick={() => {
						useSavedGraphsStore.getState().newGraph();
					}}
					className="w-full text-xs text-center py-1.5 rounded bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 cursor-pointer"
				>
					+ New graph (N)
				</button>
			</div>
		</div>
	);
}

type GraphItemProps = {
	id: SavedGraphId;
	name: string;
	isDone: boolean;
	isActive: boolean;
	isFocused: boolean;
	onSelect: () => void;
};

function GraphItem({
	id,
	name,
	isDone,
	isActive,
	isFocused,
	onSelect,
}: GraphItemProps) {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (isFocused) {
			ref.current?.scrollIntoView({ block: "nearest" });
		}
	}, [isFocused]);

	return (
		<div
			ref={ref}
			className={`group flex items-center gap-1 px-3 py-1.5 cursor-pointer ${
				isFocused
					? "bg-blue-50 dark:bg-blue-900/20"
					: "hover:bg-gray-50 dark:hover:bg-gray-700"
			} ${
				isActive
					? "text-blue-700 dark:text-blue-400 font-semibold"
					: "text-gray-700 dark:text-gray-300"
			}`}
			onClick={() => {
				useSavedGraphsStore.getState().loadGraph(id);
				onSelect();
			}}
		>
			{isDone && (
				<span
					className="text-green-600 dark:text-green-400 text-xs shrink-0"
					aria-label="Completed"
				>
					&#x2713;
				</span>
			)}
			<span className="flex-1 text-xs truncate">{name}</span>
			<button
				type="button"
				aria-label={`Delete ${name}`}
				onClick={(e) => {
					e.stopPropagation();
					useSavedGraphsStore.getState().deleteGraph(id);
				}}
				className="flex items-center justify-center w-4 h-4 rounded text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 cursor-pointer text-xs opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 active:opacity-100 [@media(hover:none)]:opacity-100"
			>
				&#x2715;
			</button>
		</div>
	);
}

export { SavedGraphsPanel };
