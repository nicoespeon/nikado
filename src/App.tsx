import { Background, Controls, ReactFlow, type NodeTypes } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect } from "react";
import { TaskNode } from "./components/nodes/TaskNode";
import { useGraphStore } from "./store/graph-store";
import { toReactFlowEdges, toReactFlowNodes } from "./store/reactflow-bridge";

const nodeTypes: NodeTypes = { task: TaskNode };

function App() {
	const graph = useGraphStore();
	const nodes = toReactFlowNodes(graph);
	const edges = toReactFlowEdges(graph);
	const isEmpty = graph.goalId === null;

	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key !== "Enter") return;

			const state = useGraphStore.getState();
			if (state.goalId !== null) return;

			state.createGoal("");
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, []);

	function createGoalOnDoubleClick(event: React.MouseEvent) {
		const isDoubleClick = event.detail === 2;
		if (!isDoubleClick) return;

		graph.createGoal("");
	}

	return (
		<div
			className="relative w-full h-full bg-gray-50"
			onClick={createGoalOnDoubleClick}
		>
			{isEmpty && (
				<div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
					<p className="text-gray-400 text-lg">
						Double-click or press Enter to create your goal
					</p>
				</div>
			)}
			<ReactFlow
				nodes={nodes}
				edges={edges}
				nodeTypes={nodeTypes}
				// Figma-like tool controls
				// Also, panOnDrag should be false for tests to work until https://github.com/testing-library/user-event/pull/1306 is released
				selectionOnDrag={true}
				panOnScroll={true}
				panOnDrag={false}
				fitView={true}
				className="bg-white"
			>
				<Background color="#e5e7eb" gap={16} />
				<Controls />
			</ReactFlow>
		</div>
	);
}

export { App };
