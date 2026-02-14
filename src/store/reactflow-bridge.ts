import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";
import {
	findLeafTasks,
	type MikadoGraph,
	type TaskId,
	type TaskLabel,
} from "../model/graph";

export type TaskNodeData = {
	taskId: TaskId;
	label: TaskLabel;
	status: string;
	isGoal: boolean;
	isLeaf: boolean;
};

export type NodeSizes = Map<string, { width: number; height: number }>;

const DEFAULT_NODE_WIDTH = 150;
const DEFAULT_NODE_HEIGHT = 40;

export function toReactFlowNodes(
	graph: MikadoGraph,
	nodeSizes: NodeSizes = new Map(),
): Node<TaskNodeData>[] {
	const layout = computeLayout(graph, nodeSizes);
	const leafIds = new Set(findLeafTasks(graph).map((t) => t.id));

	return graph.tasks.map((task) => ({
		id: task.id,
		type: "task",
		position: layout.get(task.id) ?? { x: 0, y: 0 },
		data: {
			taskId: task.id,
			label: task.label,
			status: task.status,
			isGoal: task.id === graph.goalId,
			isLeaf: leafIds.has(task.id),
		},
	}));
}

export function toReactFlowEdges(graph: MikadoGraph): Edge[] {
	return graph.dependencies.map((dep) => ({
		id: `${dep.from}-${dep.to}`,
		source: dep.from,
		target: dep.to,
		sourceHandle: "right",
		targetHandle: "left",
	}));
}

function nodeSize(id: string, nodeSizes: NodeSizes) {
	const measured = nodeSizes.get(id);
	return {
		width: measured?.width ?? DEFAULT_NODE_WIDTH,
		height: measured?.height ?? DEFAULT_NODE_HEIGHT,
	};
}

function computeLayout(graph: MikadoGraph, nodeSizes: NodeSizes) {
	const result = new Map<TaskId, { x: number; y: number }>();
	if (!graph.goalId) return result;

	const g = new dagre.graphlib.Graph();
	g.setGraph({ rankdir: "LR", ranksep: 70, nodesep: 10 });
	g.setDefaultEdgeLabel(() => ({}));

	for (const task of graph.tasks) {
		g.setNode(task.id, nodeSize(task.id, nodeSizes));
	}
	for (const dep of graph.dependencies) {
		g.setEdge(dep.from, dep.to);
	}

	dagre.layout(g);

	// Dagre returns CENTER positions; ReactFlow expects TOP-LEFT.
	// Make all positions relative to the goal's top-left corner.
	// Flip y-axis so first children appear at the top and new siblings below.
	const goalPos = g.node(graph.goalId) as { x: number; y: number };
	const goalSize = nodeSize(graph.goalId, nodeSizes);
	const goalTopLeft = {
		x: goalPos.x - goalSize.width / 2,
		y: goalPos.y - goalSize.height / 2,
	};

	result.set(graph.goalId, { x: 0, y: 0 });
	for (const task of graph.tasks) {
		if (task.id === graph.goalId) continue;
		const pos = g.node(task.id) as { x: number; y: number };
		const size = nodeSize(task.id, nodeSizes);
		result.set(task.id, {
			x: pos.x - size.width / 2 - goalTopLeft.x,
			y: -(pos.y - size.height / 2 - goalTopLeft.y),
		});
	}

	return result;
}
