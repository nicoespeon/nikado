import { compressToEncodedURIComponent } from "lz-string";
import { describe, expect, test } from "vitest";
import {
	addSubTask,
	createGoal,
	setTaskStatus,
	type MikadoGraph,
} from "./graph";
import { deserializeGraph, extractGraphData, serializeGraph } from "./url";

describe("serializeGraph / deserializeGraph round-trip", () => {
	test("round-trips an empty graph", () => {
		const graph = emptyGraph();

		const result = deserializeGraph(serializeGraph(graph));

		expect(result).toEqual(graph);
	});

	test("round-trips a graph with a single goal", () => {
		const graph = createGoal(emptyGraph(), "Refactor auth");

		const result = deserializeGraph(serializeGraph(graph));

		expect(result).toEqual(graph);
	});

	test("round-trips a graph with tasks and dependencies", () => {
		let graph = createGoal(emptyGraph(), "Ship feature");
		const goalId = graph.tasks[0].id;
		graph = addSubTask(graph, goalId, "Write tests");
		graph = addSubTask(graph, goalId, "Implement logic");

		const result = deserializeGraph(serializeGraph(graph));

		expect(result).toEqual(graph);
	});

	test("round-trips a graph with various task statuses", () => {
		let graph = createGoal(emptyGraph(), "Ship feature");
		const goalId = graph.tasks[0].id;
		graph = addSubTask(graph, goalId, "Done task");
		graph = addSubTask(graph, goalId, "Current task");
		graph = addSubTask(graph, goalId, "Parked task");
		const [, done, current, parked] = graph.tasks;
		graph = setTaskStatus(graph, done.id, "done");
		graph = setTaskStatus(graph, current.id, "current");
		graph = setTaskStatus(graph, parked.id, "parked");

		const result = deserializeGraph(serializeGraph(graph));

		expect(result).toEqual(graph);
	});
});

describe("deserializeGraph error handling", () => {
	test("returns null for empty string", () => {
		expect(deserializeGraph("")).toBeNull();
	});

	test("returns null for whitespace-only string", () => {
		expect(deserializeGraph("   ")).toBeNull();
	});

	test("returns null for random garbage", () => {
		expect(deserializeGraph("not-valid-data-!!!")).toBeNull();
	});

	test("returns null for JSON missing required fields", () => {
		const encoded = compressToEncodedURIComponent(
			JSON.stringify({ foo: "bar" }),
		);

		expect(deserializeGraph(encoded)).toBeNull();
	});

	test("returns null for tasks with invalid status", () => {
		const encoded = compressToEncodedURIComponent(
			JSON.stringify({
				goalId: "id-1",
				tasks: [{ id: "id-1", label: "Goal", status: "invalid" }],
				dependencies: [],
			}),
		);

		expect(deserializeGraph(encoded)).toBeNull();
	});

	test("returns null for dependencies with missing fields", () => {
		const encoded = compressToEncodedURIComponent(
			JSON.stringify({
				goalId: "id-1",
				tasks: [{ id: "id-1", label: "Goal", status: "pending" }],
				dependencies: [{ from: "id-1" }],
			}),
		);

		expect(deserializeGraph(encoded)).toBeNull();
	});

	test("returns null for non-object data", () => {
		const encoded = compressToEncodedURIComponent(JSON.stringify(42));

		expect(deserializeGraph(encoded)).toBeNull();
	});
});

describe("extractGraphData", () => {
	test("picks only goalId, tasks, and dependencies", () => {
		const graph = createGoal(emptyGraph(), "Goal");
		const storeState = { ...graph, editingNodeId: null, selectedNodeId: null };

		const result = extractGraphData(storeState as MikadoGraph);

		expect(result).toEqual(graph);
		expect(result).not.toHaveProperty("editingNodeId");
		expect(result).not.toHaveProperty("selectedNodeId");
	});
});

function emptyGraph(): MikadoGraph {
	return { goalId: null, tasks: [], dependencies: [] };
}
