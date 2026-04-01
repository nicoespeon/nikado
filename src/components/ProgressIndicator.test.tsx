import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../App";
import type { Task, TaskId, TaskLabel } from "../model/graph";
import { useGraphStore } from "../store/graph-store";

function resetStore() {
	useGraphStore.setState({
		goalId: null,
		tasks: [],
		dependencies: [],
		editingNodeId: null,
		selectedNodeId: null,
		past: [],
		future: [],
		canUndo: false,
		canRedo: false,
	});
}

function setupGraph(doneCount: number, totalChildren: number) {
	const goalId = "goal-id" as TaskId;
	const tasks: Task[] = [
		{ id: goalId, label: "Goal" as TaskLabel, status: "pending" },
	];
	const dependencies = [];

	for (let i = 1; i <= totalChildren; i++) {
		const taskId = `task-${String(i)}` as TaskId;
		tasks.push({
			id: taskId,
			label: `Task ${String(i)}` as TaskLabel,
			status: i <= doneCount ? "done" : "pending",
		});
		dependencies.push({ from: goalId, to: taskId });
	}

	useGraphStore.setState({ goalId, tasks, dependencies });
}

describe("ProgressIndicator", () => {
	afterEach(() => {
		cleanup();
		resetStore();
	});

	it("is not visible with fewer than 5 tasks", () => {
		setupGraph(0, 3);
		render(<App />);

		expect(screen.queryByRole("status")).not.toBeInTheDocument();
	});

	it("is visible with 5 or more tasks", async () => {
		setupGraph(2, 5);
		render(<App />);

		await waitFor(() => {
			expect(screen.getByRole("status")).toBeInTheDocument();
		});
		expect(screen.getByText("2/6")).toBeInTheDocument();
	});

	it("updates when a task is marked done", async () => {
		setupGraph(0, 5);
		render(<App />);

		await waitFor(() => {
			expect(screen.getByText("0/6")).toBeInTheDocument();
		});

		useGraphStore.getState().toggleDone("task-1" as TaskId);

		await waitFor(() => {
			expect(screen.getByText("1/6")).toBeInTheDocument();
		});
	});
});
