import { useEffect, useState } from "react";
import { GoalCelebration } from "./components/GoalCelebration";
import { MobileActionBar } from "./components/MobileActionBar";
import { MobileToolbar } from "./components/MobileToolbar";
import { OutlineView } from "./components/OutlineView";
import { graphName } from "./model/saved-graph";
import { useGraphStore } from "./store/graph-store";
import { useLicenseStore } from "./store/license-store";
import { useSavedGraphsStore } from "./store/saved-graphs-store";

function MobileView() {
	const goalId = useGraphStore((s) => s.goalId);
	const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
	const selectNode = useGraphStore((s) => s.selectNode);
	const licenseStatus = useLicenseStore((s) => s.license.status);
	const [savedGraphsOpen, setSavedGraphsOpen] = useState(false);
	const isPro = licenseStatus === "active";

	useEffect(() => {
		if (goalId && !selectedNodeId) {
			selectNode(goalId);
		}
	}, [goalId, selectedNodeId, selectNode]);

	const toggleSavedGraphs = () => {
		setSavedGraphsOpen((prev) => !prev);
	};

	if (!goalId)
		return (
			<>
				<MobileToolbar />
				{isPro && (
					<MobileSavedGraphsBar
						isOpen={savedGraphsOpen}
						onToggle={toggleSavedGraphs}
					/>
				)}
				<MobileEmptyState />
			</>
		);

	return (
		<div
			className={`h-full overflow-y-auto bg-white dark:bg-gray-900 pb-20 ${isPro ? "pt-22.5" : "pt-13.25"}`}
		>
			<GoalCelebration />
			<MobileToolbar />
			{isPro && (
				<MobileSavedGraphsBar
					isOpen={savedGraphsOpen}
					onToggle={toggleSavedGraphs}
				/>
			)}
			<OutlineView />
			<MobileActionBar />
		</div>
	);
}

function MobileSavedGraphsBar({
	isOpen,
	onToggle,
}: {
	isOpen: boolean;
	onToggle: () => void;
}) {
	const graphs = useSavedGraphsStore((s) => s.graphs);
	const activeGraphId = useSavedGraphsStore((s) => s.activeGraphId);
	const activeGraph = graphs.find((g) => g.id === activeGraphId);

	return (
		<>
			<div className="fixed top-[calc(env(safe-area-inset-top)+53px)] left-0 right-0 z-40 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800">
				<button
					type="button"
					aria-label="Saved graphs"
					aria-expanded={isOpen}
					onClick={onToggle}
					className="flex items-center justify-between w-full px-4 py-2 text-sm text-green-700 dark:text-green-400 cursor-pointer"
				>
					<span className="flex items-center gap-2">
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
							<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
						</svg>
						<span className="font-medium truncate">
							{activeGraph ? graphName(activeGraph) : "Saved graphs"}
						</span>
						{graphs.length > 0 && (
							<span className="text-xs text-green-600 dark:text-green-500">
								({graphs.length})
							</span>
						)}
					</span>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
					>
						<path d="m6 9 6 6 6-6" />
					</svg>
				</button>
			</div>

			{isOpen && (
				<>
					<div className="fixed inset-0 z-30 bg-black/30" onClick={onToggle} />
					<div className="fixed top-[calc(env(safe-area-inset-top)+90px)] left-0 right-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600 shadow-lg max-h-[60vh] overflow-y-auto">
						{graphs.length === 0 && (
							<p className="px-4 py-4 text-sm text-gray-400 dark:text-gray-500">
								No saved graphs yet. Create a goal to get started.
							</p>
						)}
						{graphs.map((g) => (
							<button
								key={g.id}
								type="button"
								onClick={() => {
									useSavedGraphsStore.getState().loadGraph(g.id);
									onToggle();
								}}
								className={`flex items-center justify-between w-full px-4 min-h-11 text-left text-sm border-b border-gray-100 dark:border-gray-700 ${
									g.id === activeGraphId
										? "text-blue-700 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-900/20"
										: "text-gray-700 dark:text-gray-300 active:bg-gray-50 dark:active:bg-gray-700"
								}`}
							>
								<span className="truncate">{graphName(g)}</span>
								<span
									role="button"
									aria-label={`Delete ${graphName(g)}`}
									onClick={(e) => {
										e.stopPropagation();
										useSavedGraphsStore.getState().deleteGraph(g.id);
									}}
									className="shrink-0 ml-2 flex items-center justify-center w-7 h-7 rounded text-gray-400 active:text-red-500 dark:text-gray-500 dark:active:text-red-400 text-xs"
								>
									&#x2715;
								</span>
							</button>
						))}
						<div className="px-4 py-3">
							<button
								type="button"
								onClick={() => {
									useSavedGraphsStore.getState().newGraph();
									onToggle();
								}}
								className="w-full text-sm text-center py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600 text-gray-600 dark:text-gray-300 cursor-pointer"
							>
								+ New graph
							</button>
						</div>
					</div>
				</>
			)}
		</>
	);
}

function MobileEmptyState() {
	function handleCreateGoal() {
		const state = useGraphStore.getState();
		state.createGoal("");
		const goalId = useGraphStore.getState().goalId;
		if (goalId) state.startEditing(goalId);
	}

	return (
		<div className="h-full flex flex-col items-center justify-center bg-white dark:bg-gray-900 px-6">
			<div className="flex items-center gap-3 mb-4">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="40"
					height="40"
					viewBox="0 0 24 24"
					fill="none"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path
						d="M16 5h-3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h3"
						stroke="#0392cf"
					/>
					<path d="M8 12h4" stroke="#0392cf" />
					<rect x="16" y="2" width="6" height="6" rx="1" stroke="#0392cf" />
					<rect x="16" y="16" width="6" height="6" rx="1" stroke="#7bc043" />
					<rect x="2" y="9" width="6" height="6" rx="1" stroke="#0392cf" />
				</svg>
				<h1
					className="text-4xl text-[#0392cf]"
					style={{ fontFamily: "'Patrick Hand', cursive" }}
				>
					Nika<span className="text-[#7bc043]">do</span>
				</h1>
			</div>
			<p className="text-gray-400 dark:text-gray-500 text-base mb-6">
				Tap to create your goal
			</p>
			<button
				type="button"
				onClick={handleCreateGoal}
				className="min-h-[44px] px-6 py-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium text-base cursor-pointer"
			>
				Create goal
			</button>
		</div>
	);
}

export { MobileView };
