import type { MikadoGraph, TaskId } from "./graph";

export type SavedGraphId = string & { readonly __brand: "SavedGraphId" };

export type SavedGraph = {
	id: SavedGraphId;
	graph: MikadoGraph;
	collapsedNodes: TaskId[];
	savedAt: number;
};

export function graphName(savedGraph: SavedGraph) {
	const goal = findGoal(savedGraph);
	if (!goal?.label) return "Untitled";
	return goal.label;
}

export function isGoalDone(savedGraph: SavedGraph) {
	return findGoal(savedGraph)?.status === "done";
}

function findGoal(savedGraph: SavedGraph) {
	if (!savedGraph.graph.goalId) return null;

	return (
		savedGraph.graph.tasks.find((t) => t.id === savedGraph.graph.goalId) ?? null
	);
}
