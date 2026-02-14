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
					isLeaf: true,
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
			dependencies: [{ from: goal.id, to: subtask.id }],
		};

		const nodes = toReactFlowNodes(graph);

		expect(nodes[1].data).toMatchObject({ isGoal: false });
	});

	test("positions child nodes to the right of the goal", () => {
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
		expect(childNode.position.x).toBeGreaterThan(goalNode.position.x);
	});

	test("positions all children to the right of the goal", () => {
		const goal = createTask("Goal");
		const c1 = createTask("C1");
		const c2 = createTask("C2");
		const graph: MikadoGraph = {
			...emptyGraph(),
			goalId: goal.id,
			tasks: [goal, c1, c2],
			dependencies: [
				{ from: goal.id, to: c1.id },
				{ from: goal.id, to: c2.id },
			],
		};

		const nodes = toReactFlowNodes(graph);
		const children = nodes.filter((n) => !n.data.isGoal);

		for (const child of children) {
			expect(child.position.x).toBeGreaterThan(0);
		}
	});

	test("positions deeper nodes further from goal horizontally", () => {
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

		const [, childNode, grandchildNode] = toReactFlowNodes(graph);

		expect(grandchildNode.position.x).toBeGreaterThan(childNode.position.x);
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
			goalId: parent.id,
			tasks: [parent, child],
			dependencies: [{ from: parent.id, to: child.id }],
		};

		const edges = toReactFlowEdges(graph);

		expect(edges).toEqual([
			{
				id: `${parent.id}-${child.id}`,
				source: parent.id,
				target: child.id,
				sourceHandle: "right",
				targetHandle: "left",
			},
		]);
	});

	test("returns empty array when no dependencies", () => {
		expect(toReactFlowEdges(emptyGraph())).toEqual([]);
	});
});
