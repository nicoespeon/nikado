import { describe, expect, test } from "vitest";
import { createTask, type MikadoGraph } from "../model/graph";
import { toReactFlowEdges, toReactFlowNodes } from "./reactflow-bridge";

function emptyGraph(): MikadoGraph {
	return { goalId: null, tasks: [], dependencies: [] };
}

describe("toReactFlowNodes", () => {
	test("maps tasks to ReactFlow nodes with task type", () => {
		const goal = createTask("The goal");
		const graph: MikadoGraph = {
			...emptyGraph(),
			goalId: goal.id,
			tasks: [goal],
		};

		const nodes = toReactFlowNodes(graph);

		expect(nodes).toEqual([
			{
				id: goal.id,
				type: "task",
				position: { x: 0, y: 0 },
				data: {
					taskId: goal.id,
					label: "The goal",
					status: "pending",
					isGoal: true,
				},
			},
		]);
	});

	test("marks non-goal tasks as isGoal: false", () => {
		const goal = createTask("Goal");
		const subtask = createTask("Subtask");
		const graph: MikadoGraph = {
			...emptyGraph(),
			goalId: goal.id,
			tasks: [goal, subtask],
		};

		const nodes = toReactFlowNodes(graph);

		expect(nodes[1].data).toMatchObject({ isGoal: false });
	});

	test("positions child nodes below their parent", () => {
		const goal = createTask("Goal");
		const child = createTask("Child");
		const graph: MikadoGraph = {
			...emptyGraph(),
			goalId: goal.id,
			tasks: [goal, child],
			dependencies: [{ from: goal.id, to: child.id }],
		};

		const [goalNode, childNode] = toReactFlowNodes(graph);

		expect(goalNode.position).toEqual({ x: 0, y: 0 });
		expect(childNode.position.y).toBeGreaterThan(goalNode.position.y);
	});

	test("spaces sibling nodes horizontally", () => {
		const goal = createTask("Goal");
		const child1 = createTask("Child 1");
		const child2 = createTask("Child 2");
		const graph: MikadoGraph = {
			...emptyGraph(),
			goalId: goal.id,
			tasks: [goal, child1, child2],
			dependencies: [
				{ from: goal.id, to: child1.id },
				{ from: goal.id, to: child2.id },
			],
		};

		const [, c1, c2] = toReactFlowNodes(graph);

		expect(c1.position.y).toBe(c2.position.y);
		expect(c1.position.x).not.toBe(c2.position.x);
	});

	test("positions nested nodes at increasing depth", () => {
		const goal = createTask("Goal");
		const child = createTask("Child");
		const grandchild = createTask("Grandchild");
		const graph: MikadoGraph = {
			...emptyGraph(),
			goalId: goal.id,
			tasks: [goal, child, grandchild],
			dependencies: [
				{ from: goal.id, to: child.id },
				{ from: child.id, to: grandchild.id },
			],
		};

		const [goalNode, childNode, grandchildNode] = toReactFlowNodes(graph);

		expect(childNode.position.y).toBeGreaterThan(goalNode.position.y);
		expect(grandchildNode.position.y).toBeGreaterThan(childNode.position.y);
	});

	test("returns empty array for empty graph", () => {
		expect(toReactFlowNodes(emptyGraph())).toEqual([]);
	});
});

describe("toReactFlowEdges", () => {
	test("maps dependencies to ReactFlow edges", () => {
		const parent = createTask("Parent");
		const child = createTask("Child");
		const graph: MikadoGraph = {
			...emptyGraph(),
			tasks: [parent, child],
			dependencies: [{ from: parent.id, to: child.id }],
		};

		const edges = toReactFlowEdges(graph);

		expect(edges).toEqual([
			{
				id: `${parent.id}-${child.id}`,
				source: parent.id,
				target: child.id,
			},
		]);
	});

	test("returns empty array when no dependencies", () => {
		expect(toReactFlowEdges(emptyGraph())).toEqual([]);
	});
});
