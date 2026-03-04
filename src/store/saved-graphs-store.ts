import { create } from "zustand";
import type { MikadoGraph, TaskId } from "../model/graph";
import type { SavedGraph, SavedGraphId } from "../model/saved-graph";
import { extractGraphData } from "../model/url";
import { useGraphStore } from "./graph-store";

type SavedGraphsStore = {
	graphs: SavedGraph[];
	activeGraphId: SavedGraphId | null;
	saveCurrentGraph(): void;
	loadGraph(id: SavedGraphId): void;
	deleteGraph(id: SavedGraphId): void;
	newGraph(): void;
};

const STORAGE_KEY = "nikado-saved-graphs";
const AUTO_SAVE_DEBOUNCE_MS = 1000;

function loadFromStorage(): SavedGraph[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];

		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed as SavedGraph[];
	} catch {
		return [];
	}
}

function saveToStorage(graphs: SavedGraph[]) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(graphs));
}

function snapshotCurrentGraph(): {
	graph: MikadoGraph;
	collapsedNodes: TaskId[];
} {
	const state = useGraphStore.getState();
	return {
		graph: extractGraphData(state),
		collapsedNodes: [...state.collapsedNodes],
	};
}

export const useSavedGraphsStore = create<SavedGraphsStore>((set, get) => ({
	graphs: loadFromStorage(),
	activeGraphId: null,

	saveCurrentGraph() {
		const { graph, collapsedNodes } = snapshotCurrentGraph();
		if (!graph.goalId) return;

		const { activeGraphId, graphs } = get();
		const now = Date.now();

		if (activeGraphId) {
			const updated = graphs.map((g) =>
				g.id === activeGraphId
					? { ...g, graph, collapsedNodes, savedAt: now }
					: g,
			);
			set({ graphs: updated });
			saveToStorage(updated);
		} else {
			const id = crypto.randomUUID() as SavedGraphId;
			const newGraph: SavedGraph = {
				id,
				graph,
				collapsedNodes,
				savedAt: now,
			};
			const updated = [...graphs, newGraph];
			set({ graphs: updated, activeGraphId: id });
			saveToStorage(updated);
		}
	},

	loadGraph(id) {
		const { activeGraphId } = get();

		if (activeGraphId) {
			get().saveCurrentGraph();
		}

		const target = get().graphs.find((g) => g.id === id);
		if (!target) return;

		useGraphStore.setState({
			...target.graph,
			collapsedNodes: new Set(target.collapsedNodes),
			past: [],
			future: [],
			canUndo: false,
			canRedo: false,
			editingNodeId: null,
			selectedNodeId: null,
		});

		set({ activeGraphId: id });
	},

	deleteGraph(id) {
		const { graphs, activeGraphId } = get();
		const updated = graphs.filter((g) => g.id !== id);
		set({
			graphs: updated,
			activeGraphId: activeGraphId === id ? null : activeGraphId,
		});
		saveToStorage(updated);
	},

	newGraph() {
		const { activeGraphId } = get();

		if (activeGraphId) {
			get().saveCurrentGraph();
		}

		useGraphStore.setState({
			goalId: null,
			tasks: [],
			dependencies: [],
			past: [],
			future: [],
			canUndo: false,
			canRedo: false,
			editingNodeId: null,
			selectedNodeId: null,
			collapsedNodes: new Set(),
		});

		set({ activeGraphId: null });
	},
}));

let autoSaveTimeout: ReturnType<typeof setTimeout> | undefined;

useGraphStore.subscribe((state) => {
	clearTimeout(autoSaveTimeout);
	autoSaveTimeout = setTimeout(() => {
		const { activeGraphId } = useSavedGraphsStore.getState();
		if (!activeGraphId && state.goalId) {
			useSavedGraphsStore.getState().saveCurrentGraph();
		} else if (activeGraphId) {
			useSavedGraphsStore.getState().saveCurrentGraph();
		}
	}, AUTO_SAVE_DEBOUNCE_MS);
});

export function resetSavedGraphsStore() {
	clearTimeout(autoSaveTimeout);
	localStorage.removeItem(STORAGE_KEY);
	useSavedGraphsStore.setState({ graphs: [], activeGraphId: null });
}
