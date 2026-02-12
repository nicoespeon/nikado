type Brand<T, B extends string> = T & { readonly __brand: B };

export type TaskId = Brand<string, "TaskId">;

export type TaskStatus = "pending" | "current" | "done" | "parked";

export type Task = {
	id: TaskId;
	label: string;
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
	return {
		...graph,
		tasks: graph.tasks.map((t) => (t.id === taskId ? { ...t, label } : t)),
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
	const tasksWithOutgoingEdges = new Set(graph.dependencies.map((d) => d.from));
	return graph.tasks.filter((t) => !tasksWithOutgoingEdges.has(t.id));
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
		label,
		status: "pending",
	};
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
