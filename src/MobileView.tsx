import { MobileActionBar } from "./components/MobileActionBar";
import { OutlineView } from "./components/OutlineView";
import { useGraphStore } from "./store/graph-store";

function MobileView() {
	const goalId = useGraphStore((s) => s.goalId);

	if (!goalId) return <MobileEmptyState />;

	return (
		<div className="h-full overflow-y-auto bg-white dark:bg-gray-900 pb-20">
			<OutlineView />
			<MobileActionBar />
		</div>
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
