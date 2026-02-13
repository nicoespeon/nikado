import {
	Background,
	Controls,
	ReactFlow,
	useReactFlow,
	type Node,
	type NodeChange,
	type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useState } from "react";
import { TaskNode } from "./components/nodes/TaskNode";
import { findChildren, findParent, type TaskId } from "./model/graph";
import { useGraphStore } from "./store/graph-store";
import {
	toReactFlowEdges,
	toReactFlowNodes,
	type NodeSizes,
} from "./store/reactflow-bridge";

const nodeTypes: NodeTypes = { task: TaskNode };

function AutoFitView() {
	const { fitView } = useReactFlow();
	const taskCount = useGraphStore((s) => s.tasks.length);

	useEffect(() => {
		if (taskCount <= 1) return;
		void fitView({ duration: 200 });
	}, [taskCount, fitView]);

	return null;
}

function App() {
	const graph = useGraphStore();
	const [nodeSizes, setNodeSizes] = useState<NodeSizes>(new Map());
	const rawNodes = toReactFlowNodes(graph, nodeSizes);
	const edges = toReactFlowEdges(graph, nodeSizes);
	const isEmpty = graph.goalId === null;
	const selectedNodeId = graph.selectedNodeId;

	const nodes = rawNodes.map((n) => ({
		...n,
		selected: n.id === selectedNodeId,
	}));

	const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
		useGraphStore.getState().selectNode(node.id as TaskId);
	}, []);

	const onPaneClick = useCallback(() => {
		useGraphStore.getState().selectNode(null);
	}, []);

	const onNodesChange = useCallback((changes: NodeChange[]) => {
		// Skip layout recomputation during editing to avoid focus loss
		if (useGraphStore.getState().editingNodeId) return;

		setNodeSizes((prev) => {
			let next = prev;
			for (const change of changes) {
				if (change.type !== "dimensions" || !change.dimensions) continue;
				const existing = next.get(change.id);
				if (
					existing?.width === change.dimensions.width &&
					existing.height === change.dimensions.height
				)
					continue;
				if (next === prev) next = new Map(prev);
				next.set(change.id, change.dimensions);
			}
			return next;
		});
	}, []);

	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			const active = document.activeElement;
			if (
				active instanceof HTMLInputElement ||
				active instanceof HTMLTextAreaElement
			)
				return;

			const state = useGraphStore.getState();

			if (e.key === " ") {
				e.preventDefault();
				if (state.goalId === null) {
					state.createGoal("");
					const goalId = useGraphStore.getState().goalId;
					if (goalId) state.startEditing(goalId);
				} else {
					state.startEditing(state.goalId);
				}
				return;
			}

			if (e.key === "Tab" && selectedNodeId) {
				e.preventDefault();
				const newTaskId = state.addSubTask(selectedNodeId, "");
				state.startEditing(newTaskId);
				return;
			}

			if (e.key === "Enter" && selectedNodeId) {
				e.preventDefault();
				const newTaskId = state.addSibling(selectedNodeId, "");
				if (newTaskId) state.startEditing(newTaskId);
				return;
			}

			if ((e.key === "e" || e.key === "F2") && selectedNodeId) {
				e.preventDefault();
				state.startEditing(selectedNodeId);
				return;
			}

			if (e.key === "d" && selectedNodeId) {
				e.preventDefault();
				state.toggleDone(selectedNodeId);
				return;
			}

			if (e.key === "ArrowUp" && selectedNodeId) {
				e.preventDefault();
				const parentId = findParent(state, selectedNodeId);
				if (parentId) state.selectNode(parentId);
				return;
			}

			if (e.key === "ArrowDown" && selectedNodeId) {
				e.preventDefault();
				const children = findChildren(state, selectedNodeId);
				if (children.length > 0) state.selectNode(children[0]);
				return;
			}

			if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && selectedNodeId) {
				e.preventDefault();
				const parentId = findParent(state, selectedNodeId);
				if (!parentId) return;

				const allSiblings = findChildren(state, parentId);
				const currentIndex = allSiblings.indexOf(selectedNodeId);
				if (currentIndex === -1 || allSiblings.length <= 1) return;

				const next =
					e.key === "ArrowRight"
						? allSiblings[(currentIndex + 1) % allSiblings.length]
						: allSiblings[
								(currentIndex - 1 + allSiblings.length) % allSiblings.length
							];
				state.selectNode(next);
				return;
			}
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [selectedNodeId]);

	function createGoalOnDoubleClick(event: React.MouseEvent) {
		const isDoubleClick = event.detail === 2;
		if (!isDoubleClick) return;

		const state = useGraphStore.getState();
		if (state.goalId !== null) return;

		state.createGoal("");
		const goalId = useGraphStore.getState().goalId;
		if (goalId) state.startEditing(goalId);
	}

	return (
		<div
			className="relative w-full h-full bg-gray-50"
			onClick={createGoalOnDoubleClick}
		>
			{isEmpty && (
				<div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
					<p className="text-gray-400 text-lg">
						Double-click or press Space to create your goal
					</p>
				</div>
			)}
			<ReactFlow
				nodes={nodes}
				edges={edges}
				nodeTypes={nodeTypes}
				onNodesChange={onNodesChange}
				onNodeClick={onNodeClick}
				onPaneClick={onPaneClick}
				edgesFocusable={false}
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
				<AutoFitView />
			</ReactFlow>
		</div>
	);
}

export { App };
