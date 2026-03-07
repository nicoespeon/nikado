import { describe, expect, it } from "vitest";
import type { TaskId, TaskLabel } from "./graph";
import { graphName, isGoalDone, type SavedGraph } from "./saved-graph";

function savedGraph(overrides: Partial<SavedGraph["graph"]> = {}): SavedGraph {
	return {
		id: "sg-1" as SavedGraph["id"],
		graph: {
			goalId: null,
			tasks: [],
			dependencies: [],
			...overrides,
		},
		collapsedNodes: [],
		savedAt: Date.now(),
	};
}

describe("graphName", () => {
	it("returns the goal task label", () => {
		const id = "task-1" as TaskId;
		const graph = savedGraph({
			goalId: id,
			tasks: [
				{ id, label: "Migrate to React 19" as TaskLabel, status: "pending" },
			],
		});

		expect(graphName(graph)).toBe("Migrate to React 19");
	});

	it("returns 'Untitled' when goalId is null", () => {
		expect(graphName(savedGraph())).toBe("Untitled");
	});

	it("returns 'Untitled' when goal task is not found", () => {
		const graph = savedGraph({ goalId: "missing" as TaskId });

		expect(graphName(graph)).toBe("Untitled");
	});

	it("returns 'Untitled' when goal label is empty", () => {
		const id = "task-1" as TaskId;
		const graph = savedGraph({
			goalId: id,
			tasks: [{ id, label: "" as TaskLabel, status: "pending" }],
		});

		expect(graphName(graph)).toBe("Untitled");
	});
});

describe("isGoalDone", () => {
	it("returns true when the goal task is done", () => {
		const id = "task-1" as TaskId;
		const graph = savedGraph({
			goalId: id,
			tasks: [{ id, label: "Ship it" as TaskLabel, status: "done" }],
		});

		expect(isGoalDone(graph)).toBe(true);
	});

	it("returns false when the goal task is pending", () => {
		const id = "task-1" as TaskId;
		const graph = savedGraph({
			goalId: id,
			tasks: [{ id, label: "Ship it" as TaskLabel, status: "pending" }],
		});

		expect(isGoalDone(graph)).toBe(false);
	});

	it("returns false when there is no goal", () => {
		expect(isGoalDone(savedGraph())).toBe(false);
	});
});
