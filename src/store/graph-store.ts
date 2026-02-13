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

type GraphStore = MikadoGraph & {
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
	stopEditing: () => void;
	selectNode: (taskId: TaskId | null) => void;
};

export const useGraphStore = create<GraphStore>((set, get) => ({
	goalId: null,
	tasks: [],
	dependencies: [],
	editingNodeId: null,
	selectedNodeId: null,

	createGoal(label) {
		set((state) => createGoal(state, label));
	},

	createTask(label) {
		const task = createTask(label);
		set((state) => ({
			tasks: [...state.tasks, task],
		}));
		return task.id;
	},

	addSubTask(parentId, label) {
		const newGraph = addSubTaskToGraph(get(), parentId, label);
		const newTask = newGraph.tasks[newGraph.tasks.length - 1];
		set(() => newGraph);
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
		set((state) => removeTask(state, taskId));
	},

	setTaskStatus(taskId, status) {
		if (status === "done") {
			set((state) => markDone(state, taskId));
		} else {
			set((state) => setTaskStatus(state, taskId, status));
		}
	},

	toggleDone(taskId) {
		const task = get().tasks.find((t) => t.id === taskId);
		if (!task) return;

		if (task.status === "done") {
			set((state) => setTaskStatus(state, taskId, "pending"));
		} else {
			set((state) => markDone(state, taskId));
		}
	},

	startEditing(taskId) {
		set({ editingNodeId: taskId, selectedNodeId: taskId });
	},

	stopEditing() {
		set({ editingNodeId: null });
	},

	selectNode(taskId) {
		set({ selectedNodeId: taskId });
	},
}));
