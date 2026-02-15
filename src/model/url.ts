import {
	compressToEncodedURIComponent,
	decompressFromEncodedURIComponent,
} from "lz-string";
import type { MikadoGraph, TaskId, TaskStatus } from "./graph";

type DeserializedState = {
	graph: MikadoGraph;
	collapsedNodes: Set<TaskId>;
};

export function serializeGraph(
	graph: MikadoGraph,
	collapsedNodes = new Set<TaskId>(),
) {
	const payload =
		collapsedNodes.size > 0
			? { ...graph, collapsedNodes: [...collapsedNodes] }
			: graph;
	return compressToEncodedURIComponent(JSON.stringify(payload));
}

export function deserializeGraph(urlString: string): DeserializedState | null {
	if (!urlString.trim()) return null;

	try {
		const json = decompressFromEncodedURIComponent(urlString);
		if (!json) return null;

		const data: unknown = JSON.parse(json);
		if (!isValidGraph(data)) return null;

		const obj = data as Record<string, unknown>;
		const collapsedNodes = new Set<TaskId>(
			Array.isArray(obj.collapsedNodes) ? (obj.collapsedNodes as TaskId[]) : [],
		);

		const graph: MikadoGraph = {
			goalId: data.goalId,
			tasks: data.tasks,
			dependencies: data.dependencies,
		};

		return { graph, collapsedNodes };
	} catch {
		return null;
	}
}

export function extractGraphData(state: MikadoGraph): MikadoGraph {
	return {
		goalId: state.goalId,
		tasks: state.tasks,
		dependencies: state.dependencies,
	};
}

const VALID_STATUSES: Set<string> = new Set<TaskStatus>([
	"pending",
	"current",
	"done",
	"parked",
]);

function isValidGraph(data: unknown): data is MikadoGraph {
	if (typeof data !== "object" || data === null) return false;

	const obj = data as Record<string, unknown>;

	if (obj.goalId !== null && typeof obj.goalId !== "string") return false;
	if (!Array.isArray(obj.tasks)) return false;
	if (!Array.isArray(obj.dependencies)) return false;

	const validTasks = obj.tasks.every((t: unknown) => {
		if (typeof t !== "object" || t === null) return false;
		const task = t as Record<string, unknown>;
		return (
			typeof task.id === "string" &&
			typeof task.label === "string" &&
			typeof task.status === "string" &&
			VALID_STATUSES.has(task.status)
		);
	});
	if (!validTasks) return false;

	const validDeps = obj.dependencies.every((d: unknown) => {
		if (typeof d !== "object" || d === null) return false;
		const dep = d as Record<string, unknown>;
		return typeof dep.from === "string" && typeof dep.to === "string";
	});
	if (!validDeps) return false;

	if (
		obj.collapsedNodes !== undefined &&
		(!Array.isArray(obj.collapsedNodes) ||
			!obj.collapsedNodes.every((id: unknown) => typeof id === "string"))
	) {
		return false;
	}

	return true;
}
