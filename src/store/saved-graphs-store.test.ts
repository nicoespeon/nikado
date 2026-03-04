import { afterEach, describe, expect, it } from "vitest";
import type { TaskId } from "../model/graph";
import type { SavedGraph, SavedGraphId } from "../model/saved-graph";
import { useGraphStore } from "./graph-store";
import {
	resetSavedGraphsStore,
	useSavedGraphsStore,
} from "./saved-graphs-store";

function resetGraphStore() {
	useGraphStore.setState({
		goalId: null,
		tasks: [],
		dependencies: [],
		editingNodeId: null,
		selectedNodeId: null,
		past: [],
		future: [],
		canUndo: false,
		canRedo: false,
		collapsedNodes: new Set(),
	});
}

function makeSavedGraph(id: string, goalLabel: string): SavedGraph {
	const goalId = `task-${id}` as TaskId;
	return {
		id: id as SavedGraphId,
		graph: {
			goalId,
			tasks: [{ id: goalId, label: goalLabel, status: "to-do" }],
			dependencies: [],
		},
		collapsedNodes: [],
		savedAt: Date.now(),
	};
}

describe("saved-graphs-store", () => {
	afterEach(() => {
		resetGraphStore();
		resetSavedGraphsStore();
		localStorage.clear();
	});

	describe("activeGraphId persistence", () => {
		it("persists activeGraphId when saving a new graph", () => {
			useGraphStore.getState().createGoal("Test goal");
			useSavedGraphsStore.getState().saveCurrentGraph();

			const { activeGraphId } = useSavedGraphsStore.getState();
			expect(activeGraphId).not.toBeNull();
			expect(localStorage.getItem("nikado-active-graph-id")).toBe(
				activeGraphId,
			);
		});

		it("clears activeGraphId when creating a new graph", () => {
			useGraphStore.getState().createGoal("Test goal");
			useSavedGraphsStore.getState().saveCurrentGraph();

			useSavedGraphsStore.getState().newGraph();

			expect(useSavedGraphsStore.getState().activeGraphId).toBeNull();
			expect(localStorage.getItem("nikado-active-graph-id")).toBeNull();
		});

		it("persists activeGraphId when loading a graph", () => {
			useGraphStore.getState().createGoal("Graph A");
			useSavedGraphsStore.getState().saveCurrentGraph();
			const graphId = useSavedGraphsStore.getState().graphs[0].id;

			useSavedGraphsStore.getState().newGraph();
			useSavedGraphsStore.getState().loadGraph(graphId);

			expect(localStorage.getItem("nikado-active-graph-id")).toBe(graphId);
		});

		it("clears activeGraphId when deleting the active graph", () => {
			useGraphStore.getState().createGoal("Doomed");
			useSavedGraphsStore.getState().saveCurrentGraph();
			const graphId = useSavedGraphsStore.getState().graphs[0].id;

			useSavedGraphsStore.getState().deleteGraph(graphId);

			expect(useSavedGraphsStore.getState().activeGraphId).toBeNull();
			expect(localStorage.getItem("nikado-active-graph-id")).toBeNull();
		});
	});

	describe("deduplication", () => {
		it("reuses existing graph when goalId matches instead of creating a duplicate", () => {
			const existing = makeSavedGraph("graph-1", "My Goal");
			localStorage.setItem("nikado-saved-graphs", JSON.stringify([existing]));
			useSavedGraphsStore.setState({
				graphs: [existing],
				activeGraphId: null,
			});

			// Set graph store to have the same goalId
			useGraphStore.setState({
				goalId: existing.graph.goalId,
				tasks: existing.graph.tasks,
				dependencies: [],
			});

			useSavedGraphsStore.getState().saveCurrentGraph();

			const { graphs, activeGraphId } = useSavedGraphsStore.getState();
			expect(graphs).toHaveLength(1);
			expect(activeGraphId).toBe(existing.id);
		});

		it("creates a new graph when no matching goalId exists", () => {
			const existing = makeSavedGraph("graph-1", "Existing Goal");
			useSavedGraphsStore.setState({
				graphs: [existing],
				activeGraphId: null,
			});

			useGraphStore.getState().createGoal("Different Goal");
			useSavedGraphsStore.getState().saveCurrentGraph();

			expect(useSavedGraphsStore.getState().graphs).toHaveLength(2);
		});
	});
});
