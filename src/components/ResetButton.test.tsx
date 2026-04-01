import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import type { Task, TaskId, TaskLabel } from "../model/graph";
import { useGraphStore } from "../store/graph-store";

function getCanvas() {
	const canvas = document.querySelector(".react-flow");
	if (!canvas) throw new Error("Canvas not found");
	return canvas;
}

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

function setupLargeGraph({ goalDone = false } = {}) {
	const goalId = "goal-id" as TaskId;
	const tasks: Task[] = [
		{
			id: goalId,
			label: "Goal" as TaskLabel,
			status: goalDone ? "done" : "pending",
		},
	];
	const dependencies = [];

	for (let i = 1; i <= 15; i++) {
		const taskId = `task-${String(i)}` as TaskId;
		tasks.push({
			id: taskId,
			label: `Task ${String(i)}` as TaskLabel,
			status: "pending",
		});
		dependencies.push({ from: goalId, to: taskId });
	}

	useGraphStore.setState({ goalId, tasks, dependencies });
}

describe("Reset button", () => {
	afterEach(() => {
		cleanup();
		resetStore();
		window.history.replaceState(null, "", window.location.pathname);
	});

	it("renders a 'Reset' button", () => {
		render(<App />);

		expect(
			screen.getByRole("button", { name: "Reset (R)" }),
		).toBeInTheDocument();
	});

	it("is disabled when the graph is empty", () => {
		render(<App />);

		expect(screen.getByRole("button", { name: "Reset (R)" })).toBeDisabled();
	});

	it("is enabled when a goal exists", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.dblClick(getCanvas());
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});
		await user.keyboard("Goal{Enter}");
		await waitFor(() => expect(screen.getByText("Goal")).toBeInTheDocument());

		expect(
			screen.getByRole("button", { name: "Reset (R)" }),
		).not.toBeDisabled();
	});

	it("clears the graph when clicked", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.dblClick(getCanvas());
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});
		await user.keyboard("Goal{Enter}");
		await waitFor(() => expect(screen.getByText("Goal")).toBeInTheDocument());

		await user.click(screen.getByRole("button", { name: "Reset (R)" }));

		await waitFor(() => {
			expect(useGraphStore.getState().goalId).toBeNull();
			expect(useGraphStore.getState().tasks).toHaveLength(0);
			expect(
				screen.getByText(/double-click or press space to create your goal/i),
			).toBeInTheDocument();
		});
	});

	it("clears the graph with 'r' keyboard shortcut", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.dblClick(getCanvas());
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});
		await user.keyboard("Goal{Enter}");
		await waitFor(() => expect(screen.getByText("Goal")).toBeInTheDocument());

		await user.keyboard("r");

		await waitFor(() => {
			expect(useGraphStore.getState().goalId).toBeNull();
			expect(useGraphStore.getState().tasks).toHaveLength(0);
			expect(
				screen.getByText(/double-click or press space to create your goal/i),
			).toBeInTheDocument();
		});
	});

	describe("confirmation for large graphs", () => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("asks for confirmation when clicking reset with more than 15 tasks", async () => {
			const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
			const user = userEvent.setup();
			setupLargeGraph();
			render(<App />);
			await waitFor(() => expect(screen.getByText("Goal")).toBeInTheDocument());

			await user.click(screen.getByRole("button", { name: "Reset (R)" }));

			expect(confirmSpy).toHaveBeenCalled();
			expect(useGraphStore.getState().goalId).not.toBeNull();
		});

		it("resets the graph when confirmation is accepted", async () => {
			vi.spyOn(window, "confirm").mockReturnValue(true);
			const user = userEvent.setup();
			setupLargeGraph();
			render(<App />);
			await waitFor(() => expect(screen.getByText("Goal")).toBeInTheDocument());

			await user.click(screen.getByRole("button", { name: "Reset (R)" }));

			await waitFor(() => {
				expect(useGraphStore.getState().goalId).toBeNull();
			});
		});

		it("does not ask for confirmation when goal is completed", async () => {
			const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
			const user = userEvent.setup();
			setupLargeGraph({ goalDone: true });
			render(<App />);
			await waitFor(() => expect(screen.getByText("Goal")).toBeInTheDocument());

			await user.click(screen.getByRole("button", { name: "Reset (R)" }));

			expect(confirmSpy).not.toHaveBeenCalled();
			await waitFor(() => {
				expect(useGraphStore.getState().goalId).toBeNull();
			});
		});

		it("asks for confirmation on 'r' shortcut with large graph", async () => {
			const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
			const user = userEvent.setup();
			setupLargeGraph();
			render(<App />);
			await waitFor(() => expect(screen.getByText("Goal")).toBeInTheDocument());

			await user.keyboard("r");

			expect(confirmSpy).toHaveBeenCalled();
			expect(useGraphStore.getState().goalId).not.toBeNull();
		});

		it("resets on 'r' shortcut when confirmation is accepted", async () => {
			vi.spyOn(window, "confirm").mockReturnValue(true);
			const user = userEvent.setup();
			setupLargeGraph();
			render(<App />);
			await waitFor(() => expect(screen.getByText("Goal")).toBeInTheDocument());

			await user.keyboard("r");

			await waitFor(() => {
				expect(useGraphStore.getState().goalId).toBeNull();
			});
		});
	});
});
