import { create } from "zustand";
import {
	addDependency,
	addSubTask as addSubTaskToGraph,
	canMoveTask as canMoveTaskInGraph,
	createGoal,
	createTask,
	dissolveTask as dissolveTaskInGraph,
	findChildren,
	findParent,
	findSelectionAfterDissolve,
	findSelectionAfterRemove,
	insertParent as insertParentInGraph,
	markDone,
	markUndone,
	moveTask as moveTaskInGraph,
	moveSiblingDown as moveSiblingDownInGraph,
	moveSiblingUp as moveSiblingUpInGraph,
	removeTask,
	setTaskLabel,
	setTaskStatus,
	type MikadoGraph,
	type TaskId,
	type TaskStatus,
} from "../model/graph";
import {
	pushState as pushHistory,
	undo as undoHistory,
	redo as redoHistory,
	type History,
} from "../model/history";

type GraphStore = MikadoGraph &
	History & {
		editingNodeId: TaskId | null;
		selectedNodeId: TaskId | null;
		movingNodeId: TaskId | null;
		createGoal: (label: string) => void;
		createTask: (label: string) => TaskId;
		addSubTask: (parentId: TaskId, label: string) => TaskId;
		addSibling: (taskId: TaskId, label: string) => TaskId | null;
		insertParent: (taskId: TaskId, label: string) => TaskId;
		setTaskLabel: (taskId: TaskId, label: string) => void;
		addDependency: (fromId: TaskId, toId: TaskId) => void;
		removeTask: (taskId: TaskId) => void;
		dissolveTask: (taskId: TaskId) => void;
		setTaskStatus: (taskId: TaskId, status: TaskStatus) => void;
		toggleDone: (taskId: TaskId) => void;
		moveSiblingUp: (taskId: TaskId) => void;
		moveSiblingDown: (taskId: TaskId) => void;
		startMove: (taskId: TaskId) => void;
		confirmMove: (targetId: TaskId) => void;
		cancelMove: () => void;
		startEditing: (taskId: TaskId) => void;
		editTask: (taskId: TaskId) => void;
		stopEditing: () => void;
		selectNode: (taskId: TaskId | null) => void;
		reset: () => void;
		undo: () => void;
		redo: () => void;
		canUndo: boolean;
		canRedo: boolean;
		collapsedNodes: Set<TaskId>;
		toggleCollapse: (taskId: TaskId) => void;
		collapseNode: (taskId: TaskId) => void;
		expandNode: (taskId: TaskId) => void;
		expandAll: () => void;
	};

function snapshot(state: MikadoGraph): MikadoGraph {
	return {
		goalId: state.goalId,
		tasks: state.tasks,
		dependencies: state.dependencies,
	};
}

function history(state: History): History {
	return { past: state.past, future: state.future };
}

export const useGraphStore = create<GraphStore>((set, get) => ({
	goalId: null,
	tasks: [],
	dependencies: [],
	past: [],
	future: [],
	editingNodeId: null,
	selectedNodeId: null,
	movingNodeId: null,
	canUndo: false,
	canRedo: false,
	collapsedNodes: new Set(),

	createGoal(label) {
		set((state) => {
			const h = pushHistory(history(state), snapshot(state));
			return {
				...createGoal(state, label),
				...h,
				canUndo: h.past.length > 0,
				canRedo: false,
			};
		});
	},

	createTask(label) {
		const task = createTask(label);
		set((state) => {
			const h = pushHistory(history(state), snapshot(state));
			return {
				tasks: [...state.tasks, task],
				...h,
				canUndo: h.past.length > 0,
				canRedo: false,
			};
		});
		return task.id;
	},

	addSubTask(parentId, label) {
		const current = get();
		const h = pushHistory(history(current), snapshot(current));
		const newGraph = addSubTaskToGraph(current, parentId, label);
		const newTask = newGraph.tasks[newGraph.tasks.length - 1];
		set(() => ({
			...newGraph,
			...h,
			canUndo: h.past.length > 0,
			canRedo: false,
		}));
		return newTask.id;
	},

	addSibling(taskId, label) {
		const parentId = findParent(get(), taskId);
		if (!parentId) return null;

		return get().addSubTask(parentId, label);
	},

	insertParent(taskId, label) {
		const current = get();
		const h = pushHistory(history(current), snapshot(current));
		const { graph: newGraph, newTaskId } = insertParentInGraph(
			current,
			taskId,
			label,
		);
		set(() => ({
			...newGraph,
			...h,
			canUndo: h.past.length > 0,
			canRedo: false,
		}));
		return newTaskId;
	},

	setTaskLabel(taskId, label) {
		set((state) => setTaskLabel(state, taskId, label));
	},

	addDependency(fromId, toId) {
		set((state) => addDependency(state, fromId, toId));
	},

	removeTask(taskId) {
		set((state) => {
			const h = pushHistory(history(state), snapshot(state));
			const nextSelection = findSelectionAfterRemove(state, taskId);
			const newGraph = removeTask(state, taskId);
			const taskIds = new Set(newGraph.tasks.map((t) => t.id));
			return {
				...newGraph,
				goalId: state.goalId === taskId ? null : state.goalId,
				selectedNodeId: nextSelection,
				editingNodeId: null,
				collapsedNodes: pruneCollapsed(state.collapsedNodes, taskIds),
				...h,
				canUndo: h.past.length > 0,
				canRedo: false,
			};
		});
	},

	dissolveTask(taskId) {
		set((state) => {
			const newGraph = dissolveTaskInGraph(state, taskId);
			if (newGraph === state) return {};
			const h = pushHistory(history(state), snapshot(state));
			const nextSelection = findSelectionAfterDissolve(state, taskId);
			const taskIds = new Set(newGraph.tasks.map((t) => t.id));
			return {
				...newGraph,
				selectedNodeId: nextSelection,
				editingNodeId: null,
				collapsedNodes: pruneCollapsed(state.collapsedNodes, taskIds),
				...h,
				canUndo: h.past.length > 0,
				canRedo: false,
			};
		});
	},

	setTaskStatus(taskId, status) {
		if (status === "done") {
			set((state) => {
				const h = pushHistory(history(state), snapshot(state));
				return {
					...markDone(state, taskId),
					...h,
					canUndo: h.past.length > 0,
					canRedo: false,
				};
			});
		} else {
			set((state) => {
				const h = pushHistory(history(state), snapshot(state));
				const task = state.tasks.find((t) => t.id === taskId);
				const wasCompleted = task?.status === "done";
				const withAncestors = wasCompleted ? markUndone(state, taskId) : state;
				const newGraph = setTaskStatus(withAncestors, taskId, status);
				return {
					...newGraph,
					...h,
					canUndo: h.past.length > 0,
					canRedo: false,
				};
			});
		}
	},

	toggleDone(taskId) {
		const task = get().tasks.find((t) => t.id === taskId);
		if (!task) return;

		if (task.status === "done") {
			set((state) => {
				const h = pushHistory(history(state), snapshot(state));
				return {
					...markUndone(state, taskId),
					...h,
					canUndo: h.past.length > 0,
					canRedo: false,
				};
			});
		} else {
			set((state) => {
				const h = pushHistory(history(state), snapshot(state));
				return {
					...markDone(state, taskId),
					...h,
					canUndo: h.past.length > 0,
					canRedo: false,
				};
			});
		}
	},

	moveSiblingUp(taskId) {
		set((state) => {
			const newGraph = moveSiblingUpInGraph(state, taskId);
			if (newGraph === state) return {};
			const h = pushHistory(history(state), snapshot(state));
			return {
				...newGraph,
				...h,
				canUndo: h.past.length > 0,
				canRedo: false,
			};
		});
	},

	moveSiblingDown(taskId) {
		set((state) => {
			const newGraph = moveSiblingDownInGraph(state, taskId);
			if (newGraph === state) return {};
			const h = pushHistory(history(state), snapshot(state));
			return {
				...newGraph,
				...h,
				canUndo: h.past.length > 0,
				canRedo: false,
			};
		});
	},

	startMove(taskId) {
		set({ movingNodeId: taskId, selectedNodeId: taskId });
	},

	confirmMove(targetId) {
		set((state) => {
			if (!state.movingNodeId) return {};
			if (!canMoveTaskInGraph(state, state.movingNodeId, targetId)) {
				return { movingNodeId: null };
			}
			const h = pushHistory(history(state), snapshot(state));
			const newGraph = moveTaskInGraph(state, state.movingNodeId, targetId);
			return {
				...newGraph,
				movingNodeId: null,
				selectedNodeId: state.movingNodeId,
				...h,
				canUndo: h.past.length > 0,
				canRedo: false,
			};
		});
	},

	cancelMove() {
		set({ movingNodeId: null });
	},

	startEditing(taskId) {
		set({ editingNodeId: taskId, selectedNodeId: taskId });
	},

	editTask(taskId) {
		set((state) => {
			const h = pushHistory(history(state), snapshot(state));
			return {
				editingNodeId: taskId,
				selectedNodeId: taskId,
				...h,
				canUndo: h.past.length > 0,
				canRedo: false,
			};
		});
	},

	stopEditing() {
		set({ editingNodeId: null });
	},

	selectNode(taskId) {
		set({ selectedNodeId: taskId });
	},

	reset() {
		set((state) => {
			const h = pushHistory(history(state), snapshot(state));
			return {
				goalId: null,
				tasks: [],
				dependencies: [],
				editingNodeId: null,
				selectedNodeId: null,
				movingNodeId: null,
				collapsedNodes: new Set(),
				...h,
				canUndo: h.past.length > 0,
				canRedo: false,
			};
		});
	},

	undo() {
		const state = get();
		const result = undoHistory(history(state), snapshot(state));
		if (!result) return;

		const taskIds = new Set(result.graph.tasks.map((t) => t.id));
		const preservedSelection =
			state.selectedNodeId && taskIds.has(state.selectedNodeId)
				? state.selectedNodeId
				: null;
		set({
			...result.graph,
			...result.history,
			editingNodeId: null,
			selectedNodeId: preservedSelection,
			movingNodeId: null,
			canUndo: result.history.past.length > 0,
			canRedo: result.history.future.length > 0,
			collapsedNodes: pruneCollapsed(state.collapsedNodes, taskIds),
		});
	},

	redo() {
		const state = get();
		const result = redoHistory(history(state), snapshot(state));
		if (!result) return;

		const taskIds = new Set(result.graph.tasks.map((t) => t.id));
		const preservedSelection =
			state.selectedNodeId && taskIds.has(state.selectedNodeId)
				? state.selectedNodeId
				: null;
		set({
			...result.graph,
			...result.history,
			editingNodeId: null,
			selectedNodeId: preservedSelection,
			movingNodeId: null,
			canUndo: result.history.past.length > 0,
			canRedo: result.history.future.length > 0,
			collapsedNodes: pruneCollapsed(state.collapsedNodes, taskIds),
		});
	},

	toggleCollapse(taskId) {
		set((state) => {
			if (state.collapsedNodes.has(taskId)) {
				const next = new Set(state.collapsedNodes);
				next.delete(taskId);
				return { collapsedNodes: next };
			}
			if (findChildren(state, taskId).length === 0) return {};
			const next = new Set(state.collapsedNodes);
			next.add(taskId);
			return { collapsedNodes: next };
		});
	},

	collapseNode(taskId) {
		set((state) => {
			if (state.collapsedNodes.has(taskId)) return {};
			if (findChildren(state, taskId).length === 0) return {};
			const next = new Set(state.collapsedNodes);
			next.add(taskId);
			return { collapsedNodes: next };
		});
	},

	expandNode(taskId) {
		set((state) => {
			if (!state.collapsedNodes.has(taskId)) return {};
			const next = new Set(state.collapsedNodes);
			next.delete(taskId);
			return { collapsedNodes: next };
		});
	},

	expandAll() {
		set({ collapsedNodes: new Set() });
	},
}));

function pruneCollapsed(collapsedNodes: Set<TaskId>, validIds: Set<TaskId>) {
	if (collapsedNodes.size === 0) return collapsedNodes;
	const pruned = new Set<TaskId>();
	for (const id of collapsedNodes) {
		if (validIds.has(id)) pruned.add(id);
	}
	return pruned;
}
