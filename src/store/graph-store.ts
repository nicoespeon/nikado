import { create } from "zustand";
import {
	addDependency,
	createGoal,
	createTask,
	removeTask,
	setTaskLabel,
	setTaskStatus,
	type MikadoGraph,
	type TaskId,
	type TaskStatus,
} from "../model/graph";

type GraphStore = MikadoGraph & {
	createGoal: (label: string) => void;
	createTask: (label: string) => TaskId;
	setTaskLabel: (taskId: TaskId, label: string) => void;
	addDependency: (fromId: TaskId, toId: TaskId) => void;
	removeTask: (taskId: TaskId) => void;
	setTaskStatus: (taskId: TaskId, status: TaskStatus) => void;
};

export const useGraphStore = create<GraphStore>((set) => ({
	goalId: null,
	tasks: [],
	dependencies: [],

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
		set((state) => setTaskStatus(state, taskId, status));
	},
}));
