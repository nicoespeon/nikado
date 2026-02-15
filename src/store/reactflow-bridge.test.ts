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
					hasChildren: false,
					isCollapsed: false,
					childCount: 0,
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

	test("left-aligns siblings with different widths", () => {
		const goal = createTask("Goal");
		const narrow = createTask("Short");
		const wide = createTask("A much wider task label");
		const graph: MikadoGraph = {
			...emptyGraph(),
			goalId: goal.id,
			tasks: [goal, narrow, wide],
			dependencies: [
				{ from: goal.id, to: narrow.id },
				{ from: goal.id, to: wide.id },
			],
		};

		const nodeSizes = new Map([
			[goal.id, { width: 150, height: 40 }],
			[narrow.id, { width: 100, height: 40 }],
			[wide.id, { width: 250, height: 40 }],
		]);

		const nodes = toReactFlowNodes(graph, nodeSizes);
		const narrowNode = nodes.find((n) => n.id === narrow.id)!;
		const wideNode = nodes.find((n) => n.id === wide.id)!;

		expect(narrowNode.position.x).toBe(wideNode.position.x);
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

	test("excludes edges to hidden nodes when collapsed", () => {
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

		const edges = toReactFlowEdges(graph, new Set([child.id]));

		expect(edges).toEqual([
			{
				id: `${goal.id}-${child.id}`,
				source: goal.id,
				target: child.id,
				sourceHandle: "right",
				targetHandle: "left",
			},
		]);
	});
});

describe("toReactFlowNodes with collapsed nodes", () => {
	test("excludes children of collapsed parent", () => {
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

		const nodes = toReactFlowNodes(graph, new Map(), new Set([child.id]));
		const nodeIds = nodes.map((n) => n.id);

		expect(nodeIds).toContain(goal.id);
		expect(nodeIds).toContain(child.id);
		expect(nodeIds).not.toContain(grandchild.id);
	});

	test("sets hasChildren, isCollapsed, and childCount", () => {
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

		const nodes = toReactFlowNodes(graph, new Map(), new Set([goal.id]));
		const goalNode = nodes.find((n) => n.id === goal.id);

		expect(goalNode?.data).toMatchObject({
			hasChildren: true,
			isCollapsed: true,
			childCount: 2,
		});
	});

	test("leaf nodes have hasChildren false", () => {
		const goal = createTask("Goal");
		const leaf = createTask("Leaf");
		const graph: MikadoGraph = {
			...emptyGraph(),
			goalId: goal.id,
			tasks: [goal, leaf],
			dependencies: [{ from: goal.id, to: leaf.id }],
		};

		const nodes = toReactFlowNodes(graph);
		const leafNode = nodes.find((n) => n.id === leaf.id);

		expect(leafNode?.data).toMatchObject({
			hasChildren: false,
			isCollapsed: false,
			childCount: 0,
		});
	});
});
