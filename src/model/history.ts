import type { MikadoGraph } from "./graph";

export const MAX_HISTORY_SIZE = 50;

export type History = {
	past: readonly MikadoGraph[];
	future: readonly MikadoGraph[];
};

export function pushState(history: History, current: MikadoGraph): History {
	const past = [...history.past, current];
	if (past.length > MAX_HISTORY_SIZE) past.shift();

	return { past, future: [] };
}

export function undo(history: History, current: MikadoGraph) {
	if (history.past.length === 0) return null;

	const past = history.past.slice(0, -1);
	const graph = history.past[history.past.length - 1];

	return {
		graph,
		history: { past, future: [...history.future, current] },
	};
}

export function redo(history: History, current: MikadoGraph) {
	if (history.future.length === 0) return null;

	const future = history.future.slice(0, -1);
	const graph = history.future[history.future.length - 1];

	return {
		graph,
		history: { past: [...history.past, current], future },
	};
}
