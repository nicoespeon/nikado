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
	return addDependency(
		{ ...graph, tasks: [...graph.tasks, task] },
		parentId,
		task.id,
	);
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

export function findSiblings(graph: MikadoGraph, taskId: TaskId) {
	const parentId = findParent(graph, taskId);
	if (!parentId) return [];

	return graph.dependencies
		.filter((d) => d.from === parentId && d.to !== taskId)
		.map((d) => d.to);
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
