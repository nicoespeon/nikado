import { create } from "zustand";
import {
	addDependency,
	addSubTask as addSubTaskToGraph,
	createGoal,
	createTask,
	findParent,
	markDone,
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
		createGoal: (label: string) => void;
		createTask: (label: string) => TaskId;
		addSubTask: (parentId: TaskId, label: string) => TaskId;
		addSibling: (taskId: TaskId, label: string) => TaskId | null;
		setTaskLabel: (taskId: TaskId, label: string) => void;
		addDependency: (fromId: TaskId, toId: TaskId) => void;
		removeTask: (taskId: TaskId) => void;
		setTaskStatus: (taskId: TaskId, status: TaskStatus) => void;
		toggleDone: (taskId: TaskId) => void;
		startEditing: (taskId: TaskId) => void;
		editTask: (taskId: TaskId) => void;
		stopEditing: () => void;
		selectNode: (taskId: TaskId | null) => void;
		reset: () => void;
		undo: () => void;
		redo: () => void;
		canUndo: boolean;
		canRedo: boolean;
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
	canUndo: false,
	canRedo: false,

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

	setTaskLabel(taskId, label) {
		set((state) => setTaskLabel(state, taskId, label));
	},

	addDependency(fromId, toId) {
		set((state) => addDependency(state, fromId, toId));
	},

	removeTask(taskId) {
		set((state) => {
			const h = pushHistory(history(state), snapshot(state));
			return {
				...removeTask(state, taskId),
				goalId: state.goalId === taskId ? null : state.goalId,
				selectedNodeId: null,
				editingNodeId: null,
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
				return {
					...setTaskStatus(state, taskId, status),
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
					...setTaskStatus(state, taskId, "pending"),
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

		set({
			...result.graph,
			...result.history,
			editingNodeId: null,
			selectedNodeId: null,
			canUndo: result.history.past.length > 0,
			canRedo: result.history.future.length > 0,
		});
	},

	redo() {
		const state = get();
		const result = redoHistory(history(state), snapshot(state));
		if (!result) return;

		set({
			...result.graph,
			...result.history,
			editingNodeId: null,
			selectedNodeId: null,
			canUndo: result.history.past.length > 0,
			canRedo: result.history.future.length > 0,
		});
	},
}));
