import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";
import type { MikadoGraph, TaskId } from "../model/graph";

export type TaskNodeData = {
	taskId: TaskId;
	label: string;
	status: string;
	isGoal: boolean;
	direction: "left" | "right";
};

type LayoutDirection = "left" | "right";

const NODE_WIDTH = 150;
const NODE_HEIGHT = 40;
const GOAL_WIDTH = 200;
const GOAL_HEIGHT = 50;

export function toReactFlowNodes(graph: MikadoGraph): Node<TaskNodeData>[] {
	const layout = computeMindMapLayout(graph);

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
				direction: entry?.direction ?? "right",
			},
		};
	});
}

export function toReactFlowEdges(graph: MikadoGraph): Edge[] {
	const layout = computeMindMapLayout(graph);

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

function computeMindMapLayout(graph: MikadoGraph) {
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

	layoutSubtree(graph, graph.goalId, rightChildren, "right", result);
	layoutSubtree(graph, graph.goalId, leftChildren, "left", result);

	return result;
}

function layoutSubtree(
	graph: MikadoGraph,
	goalId: TaskId,
	rootChildren: TaskId[],
	direction: LayoutDirection,
	result: Map<TaskId, LayoutEntry>,
) {
	if (rootChildren.length === 0) return;

	const g = new dagre.graphlib.Graph();
	g.setGraph({
		rankdir: direction === "right" ? "LR" : "RL",
		ranksep: 70,
		nodesep: 10,
	});
	g.setDefaultEdgeLabel(() => ({}));

	g.setNode(goalId, { width: GOAL_WIDTH, height: GOAL_HEIGHT });

	const visited = new Set<TaskId>([goalId]);
	const queue = [...rootChildren];

	for (const childId of queue) {
		if (visited.has(childId)) continue;
		visited.add(childId);

		g.setNode(childId, { width: NODE_WIDTH, height: NODE_HEIGHT });

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

	const goalPos = g.node(goalId) as { x: number; y: number };

	for (const nodeId of visited) {
		if (nodeId === goalId) continue;
		const nodePos = g.node(nodeId) as { x: number; y: number };
		result.set(nodeId, {
			position: {
				x: nodePos.x - goalPos.x,
				y: nodePos.y - goalPos.y,
			},
			direction,
		});
	}
}
