import { describe, expect, test } from "vitest";
import type { MikadoGraph, TaskId, TaskLabel } from "./graph";
import { MAX_HISTORY_SIZE, pushState, redo, undo } from "./history";

function graphWith(goalLabel: string): MikadoGraph {
	return {
		goalId: "task-1" as TaskId,
		tasks: [
			{
				id: "task-1" as TaskId,
				label: goalLabel as TaskLabel,
				status: "pending",
			},
		],
		dependencies: [],
	};
}

const emptyHistory = { past: [], future: [] };

describe("pushState", () => {
	test("adds current state to past and clears future", () => {
		const current = graphWith("A");
		const history = {
			past: [],
			future: [graphWith("X")],
		};

		const result = pushState(history, current);

		expect(result).toEqual({
			past: [current],
			future: [],
		});
	});

	test("appends to existing past", () => {
		const stateA = graphWith("A");
		const stateB = graphWith("B");
		const history = { past: [stateA], future: [] };

		const result = pushState(history, stateB);

		expect(result).toEqual({
			past: [stateA, stateB],
			future: [],
		});
	});

	test("drops oldest entry when past exceeds MAX_HISTORY_SIZE", () => {
		const pastStates = Array.from({ length: MAX_HISTORY_SIZE }, (_, i) =>
			graphWith(`state-${String(i)}`),
		);
		const history = { past: pastStates, future: [] };
		const current = graphWith("new");

		const result = pushState(history, current);

		expect(result.past).toHaveLength(MAX_HISTORY_SIZE);
		expect(result.past[0]).toEqual(graphWith("state-1"));
		expect(result.past[MAX_HISTORY_SIZE - 1]).toEqual(current);
	});
});

describe("undo", () => {
	test("moves last past state to current and pushes current to future", () => {
		const stateA = graphWith("A");
		const stateB = graphWith("B");
		const history = { past: [stateA], future: [] };

		const result = undo(history, stateB);

		expect(result).toEqual({
			graph: stateA,
			history: { past: [], future: [stateB] },
		});
	});

	test("returns null when past is empty", () => {
		const result = undo(emptyHistory, graphWith("A"));

		expect(result).toBeNull();
	});

	test("preserves remaining past entries", () => {
		const stateA = graphWith("A");
		const stateB = graphWith("B");
		const stateC = graphWith("C");
		const history = { past: [stateA, stateB], future: [] };

		const result = undo(history, stateC);

		expect(result).toEqual({
			graph: stateB,
			history: { past: [stateA], future: [stateC] },
		});
	});
});

describe("redo", () => {
	test("moves last future state to current and pushes current to past", () => {
		const stateA = graphWith("A");
		const stateB = graphWith("B");
		const history = { past: [], future: [stateB] };

		const result = redo(history, stateA);

		expect(result).toEqual({
			graph: stateB,
			history: { past: [stateA], future: [] },
		});
	});

	test("returns null when future is empty", () => {
		const result = redo(emptyHistory, graphWith("A"));

		expect(result).toBeNull();
	});

	test("preserves remaining future entries", () => {
		const stateA = graphWith("A");
		const stateB = graphWith("B");
		const stateC = graphWith("C");
		const history = { past: [], future: [stateB, stateC] };

		const result = redo(history, stateA);

		expect(result).toEqual({
			graph: stateC,
			history: { past: [stateA], future: [stateB] },
		});
	});
});
