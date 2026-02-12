import type { Edge, Node } from "@xyflow/react";
import type { MikadoGraph, TaskId } from "../model/graph";

export type TaskNodeData = {
	taskId: TaskId;
	label: string;
	status: string;
	isGoal: boolean;
};

export function toReactFlowNodes(graph: MikadoGraph): Node<TaskNodeData>[] {
	const positions = computePositions(graph);

	return graph.tasks.map((task) => ({
		id: task.id,
		type: "task",
		position: positions.get(task.id) ?? { x: 0, y: 0 },
		data: {
			taskId: task.id,
			label: task.label,
			status: task.status,
			isGoal: task.id === graph.goalId,
		},
	}));
}

const HORIZONTAL_SPACING = 200;
const VERTICAL_SPACING = 150;

function computePositions(graph: MikadoGraph) {
	const positions = new Map<TaskId, { x: number; y: number }>();
	if (!graph.goalId) return positions;

	const queue: TaskId[] = [graph.goalId];
	const visited = new Set<TaskId>();
	const levels: TaskId[][] = [];

	while (queue.length > 0) {
		const levelSize = queue.length;
		const currentLevel: TaskId[] = [];

		for (let i = 0; i < levelSize; i++) {
			const taskId = queue[i];
			if (visited.has(taskId)) continue;
			visited.add(taskId);
			currentLevel.push(taskId);

			const children = graph.dependencies
				.filter((d) => d.from === taskId)
				.map((d) => d.to);
			queue.push(...children);
		}

		queue.splice(0, levelSize);
		if (currentLevel.length > 0) levels.push(currentLevel);
	}

	for (let depth = 0; depth < levels.length; depth++) {
		const level = levels[depth];
		for (let i = 0; i < level.length; i++) {
			positions.set(level[i], {
				x: (i - (level.length - 1) / 2) * HORIZONTAL_SPACING,
				y: depth * VERTICAL_SPACING,
			});
		}
	}

	return positions;
}

export function toReactFlowEdges(graph: MikadoGraph): Edge[] {
	return graph.dependencies.map((dep) => ({
		id: `${dep.from}-${dep.to}`,
		source: dep.from,
		target: dep.to,
	}));
}
