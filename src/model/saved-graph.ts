import type { MikadoGraph, TaskId } from "./graph";

export type SavedGraphId = string & { readonly __brand: "SavedGraphId" };

export type SavedGraph = {
	id: SavedGraphId;
	graph: MikadoGraph;
	collapsedNodes: TaskId[];
	savedAt: number;
};

export function graphName(savedGraph: SavedGraph) {
	if (!savedGraph.graph.goalId) return "Untitled";

	const goal = savedGraph.graph.tasks.find(
		(t) => t.id === savedGraph.graph.goalId,
	);
	if (!goal?.label) return "Untitled";
	return goal.label;
}
