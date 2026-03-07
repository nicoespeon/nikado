import { waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { TaskId, TaskLabel } from "../model/graph";
import type { SavedGraph, SavedGraphId } from "../model/saved-graph";
import { useGraphStore } from "./graph-store";
import { resetLicenseStore, useLicenseStore } from "./license-store";
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
			tasks: [{ id: goalId, label: goalLabel as TaskLabel, status: "pending" }],
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
		resetLicenseStore();
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

	describe("auto-save license gate", () => {
		it("does not auto-save when license is inactive", async () => {
			useGraphStore.getState().createGoal("Free user goal");

			// Wait longer than the auto-save debounce (1000ms)
			await new Promise((resolve) => setTimeout(resolve, 1500));

			expect(useSavedGraphsStore.getState().graphs).toHaveLength(0);
		});

		it("auto-saves when license is active", async () => {
			useLicenseStore.setState({
				license: {
					status: "active",
					licenseKey: "test-key",
					validatedAt: Date.now(),
				},
			});

			useGraphStore.getState().createGoal("Pro user goal");

			await waitFor(
				() => {
					expect(useSavedGraphsStore.getState().graphs).toHaveLength(1);
				},
				{ timeout: 2000 },
			);
		});
	});
});
