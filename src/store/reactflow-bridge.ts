import type { Edge, Node } from "@xyflow/react";
import type { MikadoGraph, TaskId } from "../model/graph";

export type TaskNodeData = {
	taskId: TaskId;
	label: string;
	status: string;
	isGoal: boolean;
};

export function toReactFlowNodes(graph: MikadoGraph): Node<TaskNodeData>[] {
	return graph.tasks.map((task) => ({
		id: task.id,
		type: "task",
		position: { x: 0, y: 0 },
		data: {
			taskId: task.id,
			label: task.label,
			status: task.status,
			isGoal: task.id === graph.goalId,
		},
	}));
}

export function toReactFlowEdges(graph: MikadoGraph): Edge[] {
	return graph.dependencies.map((dep) => ({
		id: `${dep.from}-${dep.to}`,
		source: dep.from,
		target: dep.to,
	}));
}
