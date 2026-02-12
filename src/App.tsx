import {
	Background,
	Controls,
	ReactFlow,
	type NodeTypes,
	type OnConnectStart,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useRef } from "react";
import { TaskNode } from "./components/nodes/TaskNode";
import { useGraphStore } from "./store/graph-store";
import type { TaskId } from "./model/graph";
import { toReactFlowEdges, toReactFlowNodes } from "./store/reactflow-bridge";

const nodeTypes: NodeTypes = { task: TaskNode };

function App() {
	const graph = useGraphStore();
	const nodes = toReactFlowNodes(graph);
	const edges = toReactFlowEdges(graph);
	const isEmpty = graph.goalId === null;
	const connectingNodeId = useRef<string | null>(null);

	const onConnectStart: OnConnectStart = useCallback((_event, params) => {
		connectingNodeId.current = params.nodeId;
	}, []);

	const onConnectEnd = useCallback((event: MouseEvent | TouchEvent) => {
		const target = event.target as HTMLElement;
		const isDropOnPane = target.classList.contains("react-flow__pane");
		if (!isDropOnPane || !connectingNodeId.current) return;

		useGraphStore.getState().addSubTask(connectingNodeId.current as TaskId, "");
		connectingNodeId.current = null;
	}, []);

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
				onConnectStart={onConnectStart}
				onConnectEnd={onConnectEnd}
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
