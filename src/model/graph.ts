type Brand<T, B extends string> = T & { readonly __brand: B };

export type TaskId = Brand<string, "TaskId">;

export type TaskLabel = Brand<string, "TaskLabel">;

export const MAX_LABEL_LENGTH = 100;

export function createTaskLabel(raw: string): TaskLabel {
	return raw.slice(0, MAX_LABEL_LENGTH) as TaskLabel;
}

export type TaskStatus = "pending" | "current" | "done" | "parked";

export type Task = {
	id: TaskId;
	label: TaskLabel;
	status: TaskStatus;
};

export type Dependency = {
	from: TaskId;
	to: TaskId;
};

export type MikadoGraph = {
	goalId: TaskId | null;
	tasks: Task[];
	dependencies: Dependency[];
};

export function createGoal(graph: MikadoGraph, label: string) {
	if (graph.goalId !== null) return graph;

	const task = createTask(label);
	return {
		...graph,
		goalId: task.id,
		tasks: [...graph.tasks, task],
	};
}

export function addSubTask(
	graph: MikadoGraph,
	parentId: TaskId,
	label: string,
) {
	const task = createTask(label);
	const withNewTask = addDependency(
		{ ...graph, tasks: [...graph.tasks, task] },
		parentId,
		task.id,
	);
	return markUndone(withNewTask, parentId);
}

export function setTaskLabel(
	graph: MikadoGraph,
	taskId: TaskId,
	label: string,
) {
	const taskLabel = createTaskLabel(label);
	return {
		...graph,
		tasks: graph.tasks.map((t) =>
			t.id === taskId ? { ...t, label: taskLabel } : t,
		),
	};
}

export function dissolveTask(graph: MikadoGraph, taskId: TaskId) {
	const parentId = findParent(graph, taskId);
	if (!parentId) return graph;

	const childIds = findChildren(graph, taskId);
	if (childIds.length === 0) return graph;

	const childEdges = childIds.map((childId) => ({
		from: parentId,
		to: childId,
	}));

	const dependencies = graph.dependencies.flatMap((d) => {
		if (d.from === parentId && d.to === taskId) return childEdges;
		if (d.from === taskId) return [];
		return [d];
	});

	return {
		...graph,
		tasks: graph.tasks.filter((t) => t.id !== taskId),
		dependencies,
	};
}

export function removeTask(graph: MikadoGraph, taskId: TaskId) {
	const idsToRemove = collectDescendantsToRemove(graph, taskId);

	return {
		...graph,
		tasks: graph.tasks.filter((t) => !idsToRemove.has(t.id)),
		dependencies: graph.dependencies.filter(
			(d) => !idsToRemove.has(d.from) && !idsToRemove.has(d.to),
		),
	};
}

export function findLeafTasks(graph: MikadoGraph) {
	const childrenByTask = new Map<TaskId, TaskId[]>();
	for (const d of graph.dependencies) {
		const children = childrenByTask.get(d.from) ?? [];
		children.push(d.to);
		childrenByTask.set(d.from, children);
	}

	const taskById = new Map(graph.tasks.map((t) => [t.id, t]));

	return graph.tasks.filter((t) => {
		if (t.status === "done") return false;

		const children = childrenByTask.get(t.id);
		if (!children) return true;

		return children.every((id) => taskById.get(id)?.status === "done");
	});
}

export function canMarkDone(graph: MikadoGraph, taskId: TaskId) {
	const dependencyIds = graph.dependencies
		.filter((d) => d.from === taskId)
		.map((d) => d.to);

	return dependencyIds.every((id) => {
		const task = graph.tasks.find((t) => t.id === id);
		return task?.status === "done";
	});
}

export function setTaskStatus(
	graph: MikadoGraph,
	taskId: TaskId,
	status: TaskStatus,
) {
	return {
		...graph,
		tasks: graph.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)),
	};
}

export function markDone(graph: MikadoGraph, taskId: TaskId) {
	const idsToMark = collectDescendants(graph, taskId);
	return {
		...graph,
		tasks: graph.tasks.map((t) =>
			idsToMark.has(t.id) ? { ...t, status: "done" as const } : t,
		),
	};
}

export function markUndone(graph: MikadoGraph, taskId: TaskId) {
	const idsToUncomplete = collectDoneAncestors(graph, taskId);
	idsToUncomplete.add(taskId);
	return {
		...graph,
		tasks: graph.tasks.map((t) =>
			idsToUncomplete.has(t.id) ? { ...t, status: "pending" as const } : t,
		),
	};
}

function collectDoneAncestors(graph: MikadoGraph, taskId: TaskId) {
	const ids = new Set<TaskId>();
	let current = findParent(graph, taskId);
	while (current) {
		const task = graph.tasks.find((t) => t.id === current);
		if (task?.status !== "done") break;
		ids.add(current);
		current = findParent(graph, current);
	}
	return ids;
}

export function addDependency(
	graph: MikadoGraph,
	fromId: TaskId,
	toId: TaskId,
) {
	return {
		...graph,
		dependencies: [...graph.dependencies, { from: fromId, to: toId }],
	};
}

export function findParent(graph: MikadoGraph, taskId: TaskId) {
	const dep = graph.dependencies.find((d) => d.to === taskId);
	return dep ? dep.from : null;
}

export function findChildren(graph: MikadoGraph, taskId: TaskId) {
	return graph.dependencies.filter((d) => d.from === taskId).map((d) => d.to);
}

export function findSelectionAfterRemove(
	graph: MikadoGraph,
	taskId: TaskId,
): TaskId | null {
	const parentId = findParent(graph, taskId);
	if (!parentId) return null;

	const siblings = findChildren(graph, parentId);
	const index = siblings.indexOf(taskId);
	if (index < siblings.length - 1) return siblings[index + 1];
	if (index > 0) return siblings[index - 1];
	return parentId;
}

export function findSelectionAfterDissolve(
	graph: MikadoGraph,
	taskId: TaskId,
): TaskId | null {
	const children = findChildren(graph, taskId);
	if (children.length > 0) return children[0];
	return findParent(graph, taskId);
}

export function findSiblings(graph: MikadoGraph, taskId: TaskId) {
	const parentId = findParent(graph, taskId);
	if (!parentId) return [];

	return graph.dependencies
		.filter((d) => d.from === parentId && d.to !== taskId)
		.map((d) => d.to);
}

export function computeProgress(graph: MikadoGraph) {
	const total = graph.tasks.length;
	const done = graph.tasks.filter((t) => t.status === "done").length;
	return { done, total };
}

export function createTask(label: string): Task {
	return {
		id: crypto.randomUUID() as TaskId,
		label: createTaskLabel(label),
		status: "pending",
	};
}

export function toMarkdown(graph: MikadoGraph) {
	if (!graph.goalId) return "";

	const taskById = new Map(graph.tasks.map((t) => [t.id, t]));

	function walk(taskId: TaskId, depth: number): string {
		const task = taskById.get(taskId);
		if (!task) return "";

		const indent = "  ".repeat(depth);
		const checkbox = task.status === "done" ? "[x]" : "[ ]";
		const line = `${indent}- ${checkbox} ${task.label}`;
		const children = findChildren(graph, taskId);

		return [line, ...children.map((id) => walk(id, depth + 1))].join("\n");
	}

	return walk(graph.goalId, 0);
}

export function walkTree(
	graph: MikadoGraph,
	goalId: TaskId | null,
	collapsedNodes = new Set<TaskId>(),
): TaskId[] {
	if (!goalId) return [];

	const result: TaskId[] = [];
	function visit(taskId: TaskId) {
		result.push(taskId);
		if (collapsedNodes.has(taskId)) return;
		for (const childId of findChildren(graph, taskId)) {
			visit(childId);
		}
	}
	visit(goalId);
	return result;
}

export function taskDepth(graph: MikadoGraph, taskId: TaskId): number {
	let depth = 0;
	let current = findParent(graph, taskId);
	while (current) {
		depth++;
		current = findParent(graph, current);
	}
	return depth;
}

export function findVisibleLayer(
	graph: MikadoGraph,
	taskId: TaskId,
	collapsedNodes = new Set<TaskId>(),
): TaskId[] {
	if (!graph.goalId) return [];

	const depth = taskDepth(graph, taskId);
	const visible = walkTree(graph, graph.goalId, collapsedNodes);
	return visible.filter((id) => taskDepth(graph, id) === depth);
}

export function isNodeHidden(
	graph: MikadoGraph,
	taskId: TaskId,
	collapsedNodes: Set<TaskId>,
) {
	let current = findParent(graph, taskId);
	while (current) {
		if (collapsedNodes.has(current)) return true;
		current = findParent(graph, current);
	}
	return false;
}

export function insertParent(
	graph: MikadoGraph,
	taskId: TaskId,
	label: string,
): { graph: MikadoGraph; newTaskId: TaskId } {
	const parentId = findParent(graph, taskId);
	if (!parentId) return { graph, newTaskId: taskId };

	const task = createTask(label);
	const dependencies = graph.dependencies.map((d) =>
		d.from === parentId && d.to === taskId
			? { from: parentId, to: task.id }
			: d,
	);

	return {
		graph: {
			...graph,
			tasks: [...graph.tasks, task],
			dependencies: [...dependencies, { from: task.id, to: taskId }],
		},
		newTaskId: task.id,
	};
}

export function moveSiblingUp(graph: MikadoGraph, taskId: TaskId) {
	return moveSibling(graph, taskId, -1);
}

export function moveSiblingDown(graph: MikadoGraph, taskId: TaskId) {
	return moveSibling(graph, taskId, 1);
}

export function canMoveTask(
	graph: MikadoGraph,
	taskId: TaskId,
	newParentId: TaskId,
) {
	if (taskId === graph.goalId) return false;
	if (taskId === newParentId) return false;
	if (!graph.tasks.some((t) => t.id === newParentId)) return false;
	if (findParent(graph, taskId) === newParentId) return false;

	const descendants = collectDescendants(graph, taskId);
	return !descendants.has(newParentId);
}

export function moveTask(
	graph: MikadoGraph,
	taskId: TaskId,
	newParentId: TaskId,
) {
	if (!canMoveTask(graph, taskId, newParentId)) return graph;

	const withoutOldEdge = {
		...graph,
		dependencies: graph.dependencies.filter(
			(d) => !(d.to === taskId && d.from === findParent(graph, taskId)),
		),
	};

	const withNewEdge = addDependency(withoutOldEdge, newParentId, taskId);

	const task = graph.tasks.find((t) => t.id === taskId);
	if (task?.status !== "done") {
		return markUndone(withNewEdge, newParentId);
	}

	return withNewEdge;
}

function moveSibling(graph: MikadoGraph, taskId: TaskId, offset: -1 | 1) {
	const parentId = findParent(graph, taskId);
	if (!parentId) return graph;

	const siblingDeps = graph.dependencies
		.map((d, i) => ({ dep: d, index: i }))
		.filter(({ dep }) => dep.from === parentId);

	if (siblingDeps.length <= 1) return graph;

	const pos = siblingDeps.findIndex(({ dep }) => dep.to === taskId);
	const swapPos = pos + offset;
	if (swapPos < 0 || swapPos >= siblingDeps.length) return graph;

	const deps = [...graph.dependencies];
	const aIndex = siblingDeps[pos].index;
	const bIndex = siblingDeps[swapPos].index;
	deps[aIndex] = graph.dependencies[bIndex];
	deps[bIndex] = graph.dependencies[aIndex];

	return { ...graph, dependencies: deps };
}

function collectDescendants(graph: MikadoGraph, taskId: TaskId) {
	const ids = new Set<TaskId>([taskId]);
	const queue = findChildren(graph, taskId);

	for (const childId of queue) {
		if (ids.has(childId)) continue;
		ids.add(childId);
		queue.push(...findChildren(graph, childId));
	}

	return ids;
}

// Collects taskId + all descendants that are ONLY reachable through taskId
function collectDescendantsToRemove(graph: MikadoGraph, taskId: TaskId) {
	const idsToRemove = new Set<TaskId>([taskId]);
	const edgesWithoutRemoved = graph.dependencies.filter(
		(d) => !idsToRemove.has(d.from) && !idsToRemove.has(d.to),
	);

	const queue = graph.dependencies
		.filter((d) => d.from === taskId)
		.map((d) => d.to);

	for (const candidateId of queue) {
		if (idsToRemove.has(candidateId)) continue;

		const hasOtherParent = edgesWithoutRemoved.some(
			(d) => d.to === candidateId && !idsToRemove.has(d.from),
		);

		if (hasOtherParent) continue;

		idsToRemove.add(candidateId);

		graph.dependencies
			.filter((d) => d.from === candidateId)
			.forEach((d) => queue.push(d.to));
	}

	return idsToRemove;
}
