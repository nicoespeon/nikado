import { compressToEncodedURIComponent } from "lz-string";
import { describe, expect, test } from "vitest";
import {
	addSubTask,
	createGoal,
	setTaskStatus,
	type MikadoGraph,
	type TaskId,
} from "./graph";
import { deserializeGraph, extractGraphData, serializeGraph } from "./url";

describe("serializeGraph / deserializeGraph round-trip", () => {
	test("round-trips an empty graph", () => {
		const graph = emptyGraph();

		const result = deserializeGraph(serializeGraph(graph));

		expect(result).toEqual({ graph, collapsedNodes: new Set() });
	});

	test("round-trips a graph with a single goal", () => {
		const graph = createGoal(emptyGraph(), "Refactor auth");

		const result = deserializeGraph(serializeGraph(graph));

		expect(result).toEqual({ graph, collapsedNodes: new Set() });
	});

	test("round-trips a graph with tasks and dependencies", () => {
		let graph = createGoal(emptyGraph(), "Ship feature");
		const goalId = graph.tasks[0].id;
		graph = addSubTask(graph, goalId, "Write tests");
		graph = addSubTask(graph, goalId, "Implement logic");

		const result = deserializeGraph(serializeGraph(graph));

		expect(result).toEqual({ graph, collapsedNodes: new Set() });
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

		expect(result).toEqual({ graph, collapsedNodes: new Set() });
	});

	test("round-trips collapsed nodes", () => {
		let graph = createGoal(emptyGraph(), "Goal");
		const goalId = graph.tasks[0].id;
		graph = addSubTask(graph, goalId, "Child");
		const collapsedNodes = new Set([goalId]);

		const result = deserializeGraph(serializeGraph(graph, collapsedNodes));

		expect(result).toEqual({ graph, collapsedNodes });
	});

	test("omits collapsedNodes from serialized output when empty", () => {
		const graph = createGoal(emptyGraph(), "Goal");
		const serialized = serializeGraph(graph, new Set());

		const result = deserializeGraph(serialized);

		expect(result).toEqual({ graph, collapsedNodes: new Set() });
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

	test("returns null for invalid collapsedNodes (non-array)", () => {
		const encoded = compressToEncodedURIComponent(
			JSON.stringify({
				goalId: null,
				tasks: [],
				dependencies: [],
				collapsedNodes: "not-an-array",
			}),
		);

		expect(deserializeGraph(encoded)).toBeNull();
	});

	test("returns null for collapsedNodes with non-string items", () => {
		const encoded = compressToEncodedURIComponent(
			JSON.stringify({
				goalId: null,
				tasks: [],
				dependencies: [],
				collapsedNodes: [42],
			}),
		);

		expect(deserializeGraph(encoded)).toBeNull();
	});

	test("backward compatible: old URLs without collapsedNodes work", () => {
		const encoded = compressToEncodedURIComponent(
			JSON.stringify({
				goalId: "id-1",
				tasks: [{ id: "id-1", label: "Goal", status: "pending" }],
				dependencies: [],
			}),
		);

		const result = deserializeGraph(encoded);

		expect(result).toEqual({
			graph: {
				goalId: "id-1" as TaskId,
				tasks: [
					{
						id: "id-1" as TaskId,
						label: "Goal",
						status: "pending",
					},
				],
				dependencies: [],
			},
			collapsedNodes: new Set(),
		});
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
