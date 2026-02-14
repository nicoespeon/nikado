import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../App";
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

async function createGoal(user: ReturnType<typeof userEvent.setup>) {
	await user.dblClick(getCanvas());
	await waitFor(() => {
		expect(screen.getByLabelText("Task label")).toBeInTheDocument();
	});
	await user.keyboard("Goal{Enter}");
	await waitFor(() => expect(screen.getByText("Goal")).toBeInTheDocument());
}

async function addSubTask(
	user: ReturnType<typeof userEvent.setup>,
	label: string,
) {
	await user.keyboard("{Tab}");
	await waitFor(() => {
		expect(screen.getByLabelText("Task label")).toBeInTheDocument();
	});
	await user.keyboard(`${label}{Enter}`);
	await waitFor(() => expect(screen.getByText(label)).toBeInTheDocument());
}

function undoButton() {
	return screen.getByRole("button", { name: /undo/i });
}

function redoButton() {
	return screen.getByRole("button", { name: /redo/i });
}

describe("Undo/Redo", () => {
	afterEach(() => {
		cleanup();
		resetStore();
		window.history.replaceState(null, "", window.location.pathname);
	});

	it("undo and redo buttons are disabled initially", () => {
		render(<App />);

		expect(undoButton()).toBeDisabled();
		expect(redoButton()).toBeDisabled();
	});

	it("undo button is enabled after creating a goal", async () => {
		const user = userEvent.setup();
		render(<App />);

		await createGoal(user);

		expect(undoButton()).not.toBeDisabled();
	});

	it("undo after creating a subtask removes it", async () => {
		const user = userEvent.setup();
		render(<App />);

		await createGoal(user);
		await addSubTask(user, "Subtask");

		await user.click(undoButton());

		await waitFor(() => {
			expect(screen.queryByText("Subtask")).not.toBeInTheDocument();
		});
		expect(screen.getByText("Goal")).toBeInTheDocument();
	});

	it("redo after undo restores the subtask", async () => {
		const user = userEvent.setup();
		render(<App />);

		await createGoal(user);
		await addSubTask(user, "Subtask");

		await user.click(undoButton());
		await waitFor(() => {
			expect(screen.queryByText("Subtask")).not.toBeInTheDocument();
		});

		await user.click(redoButton());
		await waitFor(() => {
			expect(screen.getByText("Subtask")).toBeInTheDocument();
		});
	});

	it("undo walks back multiple steps", async () => {
		const user = userEvent.setup();
		render(<App />);

		await createGoal(user);
		await addSubTask(user, "Task A");
		await addSubTask(user, "Task B");

		await user.click(undoButton());
		await waitFor(() => {
			expect(screen.queryByText("Task B")).not.toBeInTheDocument();
		});

		await user.click(undoButton());
		await waitFor(() => {
			expect(screen.queryByText("Task A")).not.toBeInTheDocument();
		});
		expect(screen.getByText("Goal")).toBeInTheDocument();
	});

	it("new action after undo clears the redo stack", async () => {
		const user = userEvent.setup();
		render(<App />);

		await createGoal(user);
		await addSubTask(user, "Task A");

		await user.click(undoButton());
		await waitFor(() => {
			expect(screen.queryByText("Task A")).not.toBeInTheDocument();
		});
		expect(redoButton()).not.toBeDisabled();

		// Reset is a new action that should clear the redo stack
		await user.click(screen.getByRole("button", { name: /new graph/i }));
		await waitFor(() => {
			expect(useGraphStore.getState().goalId).toBeNull();
		});

		expect(redoButton()).toBeDisabled();
	});

	it("Ctrl+Z triggers undo", async () => {
		const user = userEvent.setup();
		render(<App />);

		await createGoal(user);
		await addSubTask(user, "Subtask");

		await user.keyboard("{Control>}z{/Control}");

		await waitFor(() => {
			expect(screen.queryByText("Subtask")).not.toBeInTheDocument();
		});
	});

	it("Ctrl+Shift+Z triggers redo", async () => {
		const user = userEvent.setup();
		render(<App />);

		await createGoal(user);
		await addSubTask(user, "Subtask");

		await user.keyboard("{Control>}z{/Control}");
		await waitFor(() => {
			expect(screen.queryByText("Subtask")).not.toBeInTheDocument();
		});

		await user.keyboard("{Control>}{Shift>}z{/Shift}{/Control}");
		await waitFor(() => {
			expect(screen.getByText("Subtask")).toBeInTheDocument();
		});
	});

	it("redo button is disabled when there is nothing to redo", async () => {
		const user = userEvent.setup();
		render(<App />);

		await createGoal(user);

		expect(redoButton()).toBeDisabled();
	});

	it("undo button is disabled after undoing all actions", async () => {
		const user = userEvent.setup();
		render(<App />);

		await createGoal(user);

		await user.click(undoButton());
		await waitFor(() => {
			expect(
				screen.getByText(/double-click or press space to create your goal/i),
			).toBeInTheDocument();
		});

		expect(undoButton()).toBeDisabled();
	});

	it("groups label editing into one undo step", async () => {
		const user = userEvent.setup();
		render(<App />);

		await createGoal(user);

		// Edit the goal label
		await user.keyboard("e");
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});
		await user.clear(screen.getByLabelText("Task label"));
		await user.keyboard("New label{Enter}");
		await waitFor(() =>
			expect(screen.getByText("New label")).toBeInTheDocument(),
		);

		// One undo should restore the original label
		await user.click(undoButton());
		await waitFor(() => {
			expect(screen.getByText("Goal")).toBeInTheDocument();
		});
	});
});
