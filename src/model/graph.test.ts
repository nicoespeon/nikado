import { describe, expect, test } from "vitest";
import {
	addDependency,
	canMarkDone,
	createGoal,
	createTask,
	findLeafTasks,
	removeTask,
	setTaskLabel,
	setTaskStatus,
	type MikadoGraph,
} from "./graph";

describe("createGoal", () => {
	test("adds a goal task to an empty graph", () => {
		const graph = emptyGraph();

		const result = createGoal(graph, "Refactor auth module");

		expect(result).toMatchObject({
			goalId: expect.any(String),
			tasks: [
				{
					id: expect.any(String),
					label: "Refactor auth module",
					status: "pending",
				},
			],
		});
		expect(result.goalId).toBe(result.tasks[0].id);
	});

	test("returns the graph unchanged when a goal already exists", () => {
		const graph = emptyGraph();
		const withGoal = createGoal(graph, "First goal");

		const result = createGoal(withGoal, "Second goal");

		expect(result).toBe(withGoal);
	});

	test("does not mutate the original graph", () => {
		const graph = emptyGraph();

		const result = createGoal(graph, "My goal");

		expect(graph.goalId).toBeNull();
		expect(graph.tasks).toEqual([]);
		expect(result).not.toBe(graph);
	});
});

describe("setTaskLabel", () => {
	test("updates the label of the specified task", () => {
		const task = createTask("Old label");
		const graph: MikadoGraph = {
			...emptyGraph(),
			tasks: [task],
		};

		const result = setTaskLabel(graph, task.id, "New label");

		expect(result.tasks).toEqual([{ ...task, label: "New label" }]);
	});

	test("does not affect other tasks", () => {
		const task1 = createTask("First");
		const task2 = createTask("Second");
		const graph: MikadoGraph = {
			...emptyGraph(),
			tasks: [task1, task2],
		};

		const result = setTaskLabel(graph, task1.id, "Updated");

		expect(result.tasks).toEqual([{ ...task1, label: "Updated" }, task2]);
	});

	test("does not mutate the original graph", () => {
		const task = createTask("Original");
		const graph: MikadoGraph = {
			...emptyGraph(),
			tasks: [task],
		};

		const result = setTaskLabel(graph, task.id, "Changed");

		expect(graph.tasks[0].label).toBe("Original");
		expect(result).not.toBe(graph);
	});
});

describe("createTask", () => {
	test("returns a task with the given label and pending status", () => {
		const task = createTask("Do the thing");

		expect(task).toEqual({
			id: expect.any(String),
			label: "Do the thing",
			status: "pending",
		});
	});

	test("generates unique IDs", () => {
		const task1 = createTask("First");
		const task2 = createTask("Second");

		expect(task1.id).not.toBe(task2.id);
	});
});

function emptyGraph(): MikadoGraph {
	return { goalId: null, tasks: [], dependencies: [] };
}

describe("addDependency", () => {
	test("adds a dependency edge to the graph", () => {
		const parent = createTask("Parent");
		const child = createTask("Child");
		const graph: MikadoGraph = {
			...emptyGraph(),
			tasks: [parent, child],
		};

		const result = addDependency(graph, parent.id, child.id);

		expect(result.dependencies).toEqual([{ from: parent.id, to: child.id }]);
	});

	test("does not mutate the original graph", () => {
		const parent = createTask("Parent");
		const child = createTask("Child");
		const graph: MikadoGraph = {
			...emptyGraph(),
			tasks: [parent, child],
		};

		const result = addDependency(graph, parent.id, child.id);

		expect(graph.dependencies).toEqual([]);
		expect(result).not.toBe(graph);
	});
});

describe("removeTask", () => {
	test("removes the task from the graph", () => {
		const task = createTask("To remove");
		const other = createTask("To keep");
		const graph: MikadoGraph = {
			...emptyGraph(),
			tasks: [task, other],
		};

		const result = removeTask(graph, task.id);

		expect(result.tasks).toEqual([other]);
	});

	test("removes edges involving the deleted task", () => {
		const parent = createTask("Parent");
		const child = createTask("Child");
		const graph: MikadoGraph = {
			...emptyGraph(),
			tasks: [parent, child],
			dependencies: [{ from: parent.id, to: child.id }],
		};

		const result = removeTask(graph, child.id);

		expect(result.dependencies).toEqual([]);
	});

	test("cascade-deletes descendants only reachable through the removed task", () => {
		// A -> B -> C, A -> D
		// Removing B should also remove C, but not D
		const a = createTask("A");
		const b = createTask("B");
		const c = createTask("C");
		const d = createTask("D");
		const graph: MikadoGraph = {
			...emptyGraph(),
			tasks: [a, b, c, d],
			dependencies: [
				{ from: a.id, to: b.id },
				{ from: b.id, to: c.id },
				{ from: a.id, to: d.id },
			],
		};

		const result = removeTask(graph, b.id);

		expect(result.tasks).toEqual([a, d]);
		expect(result.dependencies).toEqual([{ from: a.id, to: d.id }]);
	});

	test("does not remove a task reachable through another path", () => {
		// A -> B -> D, A -> C -> D
		// Removing B should NOT remove D (still reachable via C)
		const a = createTask("A");
		const b = createTask("B");
		const c = createTask("C");
		const d = createTask("D");
		const graph: MikadoGraph = {
			...emptyGraph(),
			tasks: [a, b, c, d],
			dependencies: [
				{ from: a.id, to: b.id },
				{ from: b.id, to: d.id },
				{ from: a.id, to: c.id },
				{ from: c.id, to: d.id },
			],
		};

		const result = removeTask(graph, b.id);

		expect(result.tasks).toEqual([a, c, d]);
		expect(result.dependencies).toEqual([
			{ from: a.id, to: c.id },
			{ from: c.id, to: d.id },
		]);
	});

	test("does not mutate the original graph", () => {
		const task = createTask("To remove");
		const graph: MikadoGraph = {
			...emptyGraph(),
			tasks: [task],
		};

		const result = removeTask(graph, task.id);

		expect(graph.tasks).toEqual([task]);
		expect(result).not.toBe(graph);
	});
});

describe("setTaskStatus", () => {
	test("updates the status of the specified task", () => {
		const task = createTask("A task");
		const graph: MikadoGraph = {
			...emptyGraph(),
			tasks: [task],
		};

		const result = setTaskStatus(graph, task.id, "done");

		expect(result.tasks).toEqual([{ ...task, status: "done" }]);
	});

	test("does not affect other tasks", () => {
		const task1 = createTask("First");
		const task2 = createTask("Second");
		const graph: MikadoGraph = {
			...emptyGraph(),
			tasks: [task1, task2],
		};

		const result = setTaskStatus(graph, task1.id, "current");

		expect(result.tasks).toEqual([{ ...task1, status: "current" }, task2]);
	});

	test("does not mutate the original graph", () => {
		const task = createTask("A task");
		const graph: MikadoGraph = {
			...emptyGraph(),
			tasks: [task],
		};

		const result = setTaskStatus(graph, task.id, "done");

		expect(graph.tasks[0].status).toBe("pending");
		expect(result).not.toBe(graph);
	});
});

describe("canMarkDone", () => {
	test("returns true when task has no dependencies", () => {
		const task = createTask("Standalone");
		const graph: MikadoGraph = {
			...emptyGraph(),
			tasks: [task],
		};

		expect(canMarkDone(graph, task.id)).toBe(true);
	});

	test("returns true when all dependencies are done", () => {
		const parent = createTask("Parent");
		const child = { ...createTask("Child"), status: "done" as const };
		const graph: MikadoGraph = {
			...emptyGraph(),
			tasks: [parent, child],
			dependencies: [{ from: parent.id, to: child.id }],
		};

		expect(canMarkDone(graph, parent.id)).toBe(true);
	});

	test("returns false when any dependency is not done", () => {
		const parent = createTask("Parent");
		const child1 = { ...createTask("Child 1"), status: "done" as const };
		const child2 = createTask("Child 2");
		const graph: MikadoGraph = {
			...emptyGraph(),
			tasks: [parent, child1, child2],
			dependencies: [
				{ from: parent.id, to: child1.id },
				{ from: parent.id, to: child2.id },
			],
		};

		expect(canMarkDone(graph, parent.id)).toBe(false);
	});
});

describe("findLeafTasks", () => {
	test("returns tasks with no outgoing dependencies", () => {
		const parent = createTask("Parent");
		const leaf1 = createTask("Leaf 1");
		const leaf2 = createTask("Leaf 2");
		const graph: MikadoGraph = {
			...emptyGraph(),
			tasks: [parent, leaf1, leaf2],
			dependencies: [
				{ from: parent.id, to: leaf1.id },
				{ from: parent.id, to: leaf2.id },
			],
		};

		const result = findLeafTasks(graph);

		expect(result).toEqual([leaf1, leaf2]);
	});

	test("returns all tasks when there are no dependencies", () => {
		const task1 = createTask("Task 1");
		const task2 = createTask("Task 2");
		const graph: MikadoGraph = {
			...emptyGraph(),
			tasks: [task1, task2],
		};

		const result = findLeafTasks(graph);

		expect(result).toEqual([task1, task2]);
	});

	test("returns empty array when graph has no tasks", () => {
		const graph = emptyGraph();

		expect(findLeafTasks(graph)).toEqual([]);
	});
});
