import {
	compressToEncodedURIComponent,
	decompressFromEncodedURIComponent,
} from "lz-string";
import type { MikadoGraph, TaskStatus } from "./graph";

export function serializeGraph(graph: MikadoGraph) {
	return compressToEncodedURIComponent(JSON.stringify(graph));
}

export function deserializeGraph(urlString: string): MikadoGraph | null {
	if (!urlString.trim()) return null;

	try {
		const json = decompressFromEncodedURIComponent(urlString);
		if (!json) return null;

		const data: unknown = JSON.parse(json);
		if (!isValidGraph(data)) return null;

		return data;
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

	return validDeps;
}
