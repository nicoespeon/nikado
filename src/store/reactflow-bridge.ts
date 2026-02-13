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
	direction: "left" | "right";
};

export type NodeSizes = Map<string, { width: number; height: number }>;

type LayoutDirection = "left" | "right";

const DEFAULT_NODE_WIDTH = 150;
const DEFAULT_NODE_HEIGHT = 40;

export function toReactFlowNodes(
	graph: MikadoGraph,
	nodeSizes: NodeSizes = new Map(),
): Node<TaskNodeData>[] {
	const layout = computeMindMapLayout(graph, nodeSizes);
	const leafIds = new Set(findLeafTasks(graph).map((t) => t.id));

	return graph.tasks.map((task) => {
		const entry = layout.get(task.id);
		return {
			id: task.id,
			type: "task",
			position: entry?.position ?? { x: 0, y: 0 },
			data: {
				taskId: task.id,
				label: task.label,
				status: task.status,
				isGoal: task.id === graph.goalId,
				isLeaf: leafIds.has(task.id),
				direction: entry?.direction ?? "right",
			},
		};
	});
}

export function toReactFlowEdges(
	graph: MikadoGraph,
	nodeSizes: NodeSizes = new Map(),
): Edge[] {
	const layout = computeMindMapLayout(graph, nodeSizes);

	return graph.dependencies.map((dep) => {
		const sourceDir = layout.get(dep.from)?.direction ?? "right";
		const isGoalSource = dep.from === graph.goalId;
		const targetDir = layout.get(dep.to)?.direction ?? "right";

		return {
			id: `${dep.from}-${dep.to}`,
			source: dep.from,
			target: dep.to,
			sourceHandle: isGoalSource ? targetDir : sourceDir,
			targetHandle: targetDir === "right" ? "left" : "right",
		};
	});
}

type LayoutEntry = {
	position: { x: number; y: number };
	direction: LayoutDirection;
};

function nodeSize(id: string, nodeSizes: NodeSizes) {
	const measured = nodeSizes.get(id);
	return {
		width: measured?.width ?? DEFAULT_NODE_WIDTH,
		height: measured?.height ?? DEFAULT_NODE_HEIGHT,
	};
}

function computeMindMapLayout(graph: MikadoGraph, nodeSizes: NodeSizes) {
	const result = new Map<TaskId, LayoutEntry>();
	if (!graph.goalId) return result;

	const goalChildren = graph.dependencies
		.filter((d) => d.from === graph.goalId)
		.map((d) => d.to);

	const midpoint = Math.ceil(goalChildren.length / 2);
	const rightChildren = goalChildren.slice(0, midpoint);
	const leftChildren = goalChildren.slice(midpoint);

	result.set(graph.goalId, {
		position: { x: 0, y: 0 },
		direction: "right",
	});

	layoutSubtree(graph, graph.goalId, rightChildren, "right", result, nodeSizes);
	layoutSubtree(graph, graph.goalId, leftChildren, "left", result, nodeSizes);

	return result;
}

function layoutSubtree(
	graph: MikadoGraph,
	goalId: TaskId,
	rootChildren: TaskId[],
	direction: LayoutDirection,
	result: Map<TaskId, LayoutEntry>,
	nodeSizes: NodeSizes,
) {
	if (rootChildren.length === 0) return;

	const g = new dagre.graphlib.Graph();
	g.setGraph({
		rankdir: direction === "right" ? "LR" : "RL",
		ranksep: 70,
		nodesep: 10,
	});
	g.setDefaultEdgeLabel(() => ({}));

	g.setNode(goalId, nodeSize(goalId, nodeSizes));

	const visited = new Set<TaskId>([goalId]);
	const queue = [...rootChildren];

	for (const childId of queue) {
		if (visited.has(childId)) continue;
		visited.add(childId);

		g.setNode(childId, nodeSize(childId, nodeSizes));

		const grandchildren = graph.dependencies
			.filter((d) => d.from === childId)
			.map((d) => d.to);
		queue.push(...grandchildren);
	}

	for (const childId of rootChildren) {
		g.setEdge(goalId, childId);
	}

	for (const nodeId of visited) {
		if (nodeId === goalId) continue;
		const children = graph.dependencies
			.filter((d) => d.from === nodeId && visited.has(d.to))
			.map((d) => d.to);
		for (const childId of children) {
			g.setEdge(nodeId, childId);
		}
	}

	dagre.layout(g);

	// Dagre returns CENTER positions; ReactFlow expects TOP-LEFT.
	// Convert each to top-left before computing relative offsets.
	const goalPos = g.node(goalId) as { x: number; y: number };
	const goalSize = nodeSize(goalId, nodeSizes);
	const goalTopLeft = {
		x: goalPos.x - goalSize.width / 2,
		y: goalPos.y - goalSize.height / 2,
	};

	for (const nodeId of visited) {
		if (nodeId === goalId) continue;
		const nodePos = g.node(nodeId) as { x: number; y: number };
		const size = nodeSize(nodeId, nodeSizes);
		result.set(nodeId, {
			position: {
				x: nodePos.x - size.width / 2 - goalTopLeft.x,
				y: nodePos.y - size.height / 2 - goalTopLeft.y,
			},
			direction,
		});
	}
}
