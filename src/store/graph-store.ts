import { create } from "zustand";
import {
	addDependency,
	createTask,
	removeTask,
	setTaskStatus,
	type MikadoGraph,
	type TaskId,
	type TaskStatus,
} from "../model/graph";

type GraphStore = MikadoGraph & {
	createTask: (label: string) => TaskId;
	addDependency: (fromId: TaskId, toId: TaskId) => void;
	removeTask: (taskId: TaskId) => void;
	setTaskStatus: (taskId: TaskId, status: TaskStatus) => void;
};

export const useGraphStore = create<GraphStore>((set) => ({
	goalId: null,
	tasks: [],
	dependencies: [],

	createTask(label) {
		const task = createTask(label);
		set((state) => ({
			tasks: [...state.tasks, task],
		}));
		return task.id;
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
