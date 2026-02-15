import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";
import {
	findChildren,
	findLeafTasks,
	isNodeHidden,
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
	hasChildren: boolean;
	isCollapsed: boolean;
	childCount: number;
};

export type NodeSizes = Map<string, { width: number; height: number }>;

const DEFAULT_NODE_WIDTH = 150;
const DEFAULT_NODE_HEIGHT = 40;

export function toReactFlowNodes(
	graph: MikadoGraph,
	nodeSizes: NodeSizes = new Map(),
	collapsedNodes = new Set<TaskId>(),
): Node<TaskNodeData>[] {
	const visibleTasks = graph.tasks.filter(
		(t) => !isNodeHidden(graph, t.id, collapsedNodes),
	);
	const visibleGraph: MikadoGraph = {
		...graph,
		tasks: visibleTasks,
		dependencies: graph.dependencies.filter(
			(d) =>
				!isNodeHidden(graph, d.from, collapsedNodes) &&
				!isNodeHidden(graph, d.to, collapsedNodes),
		),
	};

	const layout = computeLayout(visibleGraph, nodeSizes);
	const leafIds = new Set(findLeafTasks(graph).map((t) => t.id));

	return visibleTasks.map((task) => ({
		id: task.id,
		type: "task",
		position: layout.get(task.id) ?? { x: 0, y: 0 },
		data: {
			taskId: task.id,
			label: task.label,
			status: task.status,
			isGoal: task.id === graph.goalId,
			isLeaf: leafIds.has(task.id),
			hasChildren: findChildren(graph, task.id).length > 0,
			isCollapsed: collapsedNodes.has(task.id),
			childCount: findChildren(graph, task.id).length,
		},
	}));
}

export function toReactFlowEdges(
	graph: MikadoGraph,
	collapsedNodes = new Set<TaskId>(),
): Edge[] {
	return graph.dependencies
		.filter(
			(dep) =>
				!isNodeHidden(graph, dep.from, collapsedNodes) &&
				!isNodeHidden(graph, dep.to, collapsedNodes),
		)
		.map((dep) => ({
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
	g.setGraph({ rankdir: "LR", ranksep: 70, nodesep: 20 });
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

	// Left-align nodes within the same rank (same dagre x-center).
	// Dagre centers nodes, so siblings with different widths have misaligned left edges.
	const nodesByRank = new Map<number, { id: TaskId; leftEdge: number }[]>();
	for (const task of graph.tasks) {
		const pos = g.node(task.id) as { x: number; y: number };
		const size = nodeSize(task.id, nodeSizes);
		const leftEdge = pos.x - size.width / 2;
		const rankX = Math.round(pos.x);
		const group = nodesByRank.get(rankX) ?? [];
		group.push({ id: task.id, leftEdge });
		nodesByRank.set(rankX, group);
	}

	const leftAlignOffset = new Map<TaskId, number>();
	for (const group of nodesByRank.values()) {
		if (group.length <= 1) continue;
		const minLeftEdge = Math.min(...group.map((n) => n.leftEdge));
		for (const node of group) {
			leftAlignOffset.set(node.id, node.leftEdge - minLeftEdge);
		}
	}

	result.set(graph.goalId, { x: 0, y: 0 });
	for (const task of graph.tasks) {
		if (task.id === graph.goalId) continue;
		const pos = g.node(task.id) as { x: number; y: number };
		const size = nodeSize(task.id, nodeSizes);
		const offset = leftAlignOffset.get(task.id) ?? 0;
		result.set(task.id, {
			x: pos.x - size.width / 2 - goalTopLeft.x - offset,
			y: -(pos.y - size.height / 2 - goalTopLeft.y),
		});
	}

	return result;
}
