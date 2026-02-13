import { describe, expect, test } from "vitest";
import {
	addDependency,
	addSubTask,
	canMarkDone,
	createGoal,
	createTask,
	findChildren,
	findLeafTasks,
	findParent,
	findSiblings,
	markDone,
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

describe("addSubTask", () => {
	test("creates a new task as a dependency of the parent", () => {
		const parent = createTask("Parent");
		const graph: MikadoGraph = {
			...emptyGraph(),
			goalId: parent.id,
			tasks: [parent],
		};

		const result = addSubTask(graph, parent.id, "Child");

		expect(result.tasks).toHaveLength(2);
		expect(result.tasks[1]).toMatchObject({
			label: "Child",
			status: "pending",
		});
		expect(result.dependencies).toEqual([
			{ from: parent.id, to: result.tasks[1].id },
		]);
	});

	test("works at arbitrary depth", () => {
		const goal = createTask("Goal");
		const child = createTask("Child");
		const graph: MikadoGraph = {
			...emptyGraph(),
			goalId: goal.id,
			tasks: [goal, child],
			dependencies: [{ from: goal.id, to: child.id }],
		};

		const result = addSubTask(graph, child.id, "Grandchild");

		expect(result.tasks).toHaveLength(3);
		expect(result.dependencies).toEqual([
			{ from: goal.id, to: child.id },
			{ from: child.id, to: result.tasks[2].id },
		]);
	});

	test("does not mutate the original graph", () => {
		const parent = createTask("Parent");
		const graph: MikadoGraph = {
			...emptyGraph(),
			tasks: [parent],
		};

		addSubTask(graph, parent.id, "Child");

		expect(graph.tasks).toHaveLength(1);
		expect(graph.dependencies).toEqual([]);
	});
});

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

	test("excludes done tasks", () => {
		const parent = createTask("Parent");
		const doneLeaf = { ...createTask("Done Leaf"), status: "done" as const };
		const pendingLeaf = createTask("Pending Leaf");
		const graph: MikadoGraph = {
			...emptyGraph(),
			tasks: [parent, doneLeaf, pendingLeaf],
			dependencies: [
				{ from: parent.id, to: doneLeaf.id },
				{ from: parent.id, to: pendingLeaf.id },
			],
		};

		expect(findLeafTasks(graph)).toEqual([pendingLeaf]);
	});

	test("treats a task with all done children as a leaf", () => {
		const parent = createTask("Parent");
		const doneChild = { ...createTask("Done Child"), status: "done" as const };
		const graph: MikadoGraph = {
			...emptyGraph(),
			tasks: [parent, doneChild],
			dependencies: [{ from: parent.id, to: doneChild.id }],
		};

		expect(findLeafTasks(graph)).toEqual([parent]);
	});

	test("does not treat a task with some pending children as a leaf", () => {
		const parent = createTask("Parent");
		const doneChild = { ...createTask("Done"), status: "done" as const };
		const pendingChild = createTask("Pending");
		const graph: MikadoGraph = {
			...emptyGraph(),
			tasks: [parent, doneChild, pendingChild],
			dependencies: [
				{ from: parent.id, to: doneChild.id },
				{ from: parent.id, to: pendingChild.id },
			],
		};

		expect(findLeafTasks(graph)).toEqual([pendingChild]);
	});
});

describe("findParent", () => {
	test("returns null for the root task", () => {
		const goal = createTask("Goal");
		const graph: MikadoGraph = {
			...emptyGraph(),
			goalId: goal.id,
			tasks: [goal],
		};

		expect(findParent(graph, goal.id)).toBeNull();
	});

	test("returns the parent task ID for a child", () => {
		const goal = createTask("Goal");
		const child = createTask("Child");
		const graph: MikadoGraph = {
			...emptyGraph(),
			goalId: goal.id,
			tasks: [goal, child],
			dependencies: [{ from: goal.id, to: child.id }],
		};

		expect(findParent(graph, child.id)).toBe(goal.id);
	});

	test("returns the first parent when a task has multiple parents", () => {
		const a = createTask("A");
		const b = createTask("B");
		const shared = createTask("Shared");
		const graph: MikadoGraph = {
			...emptyGraph(),
			goalId: a.id,
			tasks: [a, b, shared],
			dependencies: [
				{ from: a.id, to: shared.id },
				{ from: b.id, to: shared.id },
			],
		};

		expect(findParent(graph, shared.id)).toBe(a.id);
	});
});

describe("findChildren", () => {
	test("returns direct children of a task", () => {
		const parent = createTask("Parent");
		const child1 = createTask("Child 1");
		const child2 = createTask("Child 2");
		const graph: MikadoGraph = {
			...emptyGraph(),
			tasks: [parent, child1, child2],
			dependencies: [
				{ from: parent.id, to: child1.id },
				{ from: parent.id, to: child2.id },
			],
		};

		expect(findChildren(graph, parent.id)).toEqual([child1.id, child2.id]);
	});

	test("returns empty array for leaf tasks", () => {
		const leaf = createTask("Leaf");
		const graph: MikadoGraph = {
			...emptyGraph(),
			tasks: [leaf],
		};

		expect(findChildren(graph, leaf.id)).toEqual([]);
	});
});

describe("findSiblings", () => {
	test("returns empty array for the root task", () => {
		const goal = createTask("Goal");
		const graph: MikadoGraph = {
			...emptyGraph(),
			goalId: goal.id,
			tasks: [goal],
		};

		expect(findSiblings(graph, goal.id)).toEqual([]);
	});

	test("returns other children of the same parent", () => {
		const goal = createTask("Goal");
		const c1 = createTask("C1");
		const c2 = createTask("C2");
		const c3 = createTask("C3");
		const graph: MikadoGraph = {
			...emptyGraph(),
			goalId: goal.id,
			tasks: [goal, c1, c2, c3],
			dependencies: [
				{ from: goal.id, to: c1.id },
				{ from: goal.id, to: c2.id },
				{ from: goal.id, to: c3.id },
			],
		};

		expect(findSiblings(graph, c2.id)).toEqual([c1.id, c3.id]);
	});
});

describe("markDone", () => {
	test("marks a leaf task done", () => {
		const task = createTask("Leaf");
		const graph: MikadoGraph = {
			...emptyGraph(),
			tasks: [task],
		};

		const result = markDone(graph, task.id);

		expect(result.tasks).toEqual([{ ...task, status: "done" }]);
	});

	test("cascades done to all descendants", () => {
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

		const result = markDone(graph, goal.id);

		expect(result.tasks).toEqual([
			{ ...goal, status: "done" },
			{ ...child, status: "done" },
			{ ...grandchild, status: "done" },
		]);
	});

	test("does not affect tasks outside the subtree", () => {
		const a = createTask("A");
		const b = createTask("B");
		const c = createTask("C");
		const graph: MikadoGraph = {
			...emptyGraph(),
			goalId: a.id,
			tasks: [a, b, c],
			dependencies: [
				{ from: a.id, to: b.id },
				{ from: a.id, to: c.id },
			],
		};

		const result = markDone(graph, b.id);

		expect(result.tasks).toEqual([a, { ...b, status: "done" }, c]);
	});

	test("does not mutate the original graph", () => {
		const task = createTask("Task");
		const graph: MikadoGraph = {
			...emptyGraph(),
			tasks: [task],
		};

		const result = markDone(graph, task.id);

		expect(graph.tasks[0].status).toBe("pending");
		expect(result).not.toBe(graph);
	});
});
