import { create } from "zustand";
import type { MikadoGraph, TaskId } from "../model/graph";
import type { SavedGraph, SavedGraphId } from "../model/saved-graph";
import { extractGraphData } from "../model/url";
import { useGraphStore } from "./graph-store";
import { useLicenseStore } from "./license-store";

type SavedGraphsStore = {
	graphs: SavedGraph[];
	activeGraphId: SavedGraphId | null;
	saveCurrentGraph(): void;
	loadGraph(id: SavedGraphId): void;
	deleteGraph(id: SavedGraphId): void;
	newGraph(): void;
};

const STORAGE_KEY = "nikado-saved-graphs";
/**
 * Persist activeGraphId separately so auto-save recognizes the active graph
 * after a page reload, preventing duplicates with HMR when developing.
 */
const ACTIVE_GRAPH_KEY = "nikado-active-graph-id";
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

function loadActiveGraphId(graphs: SavedGraph[]): SavedGraphId | null {
	const id = localStorage.getItem(ACTIVE_GRAPH_KEY);
	if (!id) return null;

	const exists = graphs.some((g) => g.id === id);
	return exists ? (id as SavedGraphId) : null;
}

function saveToStorage(graphs: SavedGraph[]) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(graphs));
}

function saveActiveGraphId(id: SavedGraphId | null) {
	if (id) {
		localStorage.setItem(ACTIVE_GRAPH_KEY, id);
	} else {
		localStorage.removeItem(ACTIVE_GRAPH_KEY);
	}
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

const initialGraphs = loadFromStorage();

export const useSavedGraphsStore = create<SavedGraphsStore>((set, get) => ({
	graphs: initialGraphs,
	activeGraphId: loadActiveGraphId(initialGraphs),

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
			// Check if a graph with the same goalId already exists (prevents duplicates)
			const existing = graphs.find((g) => g.graph.goalId === graph.goalId);
			if (existing) {
				const updated = graphs.map((g) =>
					g.id === existing.id
						? { ...g, graph, collapsedNodes, savedAt: now }
						: g,
				);
				set({ graphs: updated, activeGraphId: existing.id });
				saveToStorage(updated);
				saveActiveGraphId(existing.id);
				return;
			}

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
			saveActiveGraphId(id);
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
		saveActiveGraphId(id);
	},

	deleteGraph(id) {
		const { graphs, activeGraphId } = get();
		const updated = graphs.filter((g) => g.id !== id);
		const newActiveId = activeGraphId === id ? null : activeGraphId;
		set({
			graphs: updated,
			activeGraphId: newActiveId,
		});
		saveToStorage(updated);
		saveActiveGraphId(newActiveId);
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
		saveActiveGraphId(null);
	},
}));

let autoSaveTimeout: ReturnType<typeof setTimeout> | undefined;

useGraphStore.subscribe((state) => {
	clearTimeout(autoSaveTimeout);
	autoSaveTimeout = setTimeout(() => {
		if (useLicenseStore.getState().license.status !== "active") return;

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
	localStorage.removeItem(ACTIVE_GRAPH_KEY);
	useSavedGraphsStore.setState({ graphs: [], activeGraphId: null });
}
