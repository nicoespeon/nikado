import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";
import type { TaskId } from "./model/graph";
import { useGraphStore } from "./store/graph-store";

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
	});
}

function getGoalId() {
	const { goalId } = useGraphStore.getState();
	if (!goalId) throw new Error("No goal exists");
	return goalId;
}

function selectNode(taskId: TaskId) {
	useGraphStore.getState().selectNode(taskId);
}

describe("App", () => {
	afterEach(() => {
		cleanup();
		resetStore();
	});

	it("shows instruction when canvas is empty", () => {
		render(<App />);

		expect(
			screen.getByText(/double-click or press space to create your goal/i),
		).toBeInTheDocument();
	});

	it("hides instruction after creating a goal", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.dblClick(getCanvas());

		await waitFor(() => {
			expect(
				screen.queryByText(/double-click or press space to create your goal/i),
			).not.toBeInTheDocument();
		});
	});

	it("creates a goal node on double-click with editable label", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.dblClick(getCanvas());

		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});
	});

	it("pre-fills the label input with default text", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.dblClick(getCanvas());

		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toHaveValue(
				"Do something great",
			);
		});
	});

	it("does not create a second goal on double-click", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.dblClick(getCanvas());
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});

		await user.keyboard("{Enter}");

		await user.dblClick(getCanvas());

		await waitFor(() => {
			const nodes = document.querySelectorAll(".react-flow__node");
			expect(nodes).toHaveLength(1);
		});
	});

	it("confirms label with Enter", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.dblClick(getCanvas());
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});

		await user.keyboard("My Goal{Enter}");

		await waitFor(() => {
			expect(screen.getByText("My Goal")).toBeInTheDocument();
		});
	});

	it("keeps default label on Enter without typing", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.dblClick(getCanvas());
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});

		await user.keyboard("{Enter}");

		await waitFor(() => {
			expect(screen.getByText("Do something great")).toBeInTheDocument();
		});
	});

	it("keeps default label on Escape", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.dblClick(getCanvas());
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});

		await user.keyboard("{Escape}");

		await waitFor(() => {
			expect(screen.getByText("Do something great")).toBeInTheDocument();
		});
	});

	it("creates a goal with Space key", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.keyboard(" ");

		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});
	});

	it("focuses goal and enters edit mode when pressing Space with existing goal", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.dblClick(getCanvas());
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});
		await user.keyboard("My Goal{Enter}");
		await waitFor(() => {
			expect(screen.getByText("My Goal")).toBeInTheDocument();
		});

		await user.keyboard(" ");

		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});
	});

	it("creates a sub-task with Tab when a node is selected", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.dblClick(getCanvas());
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});
		await user.keyboard("My Goal{Enter}");
		await waitFor(() => {
			expect(screen.getByText("My Goal")).toBeInTheDocument();
		});

		selectNode(getGoalId());
		await user.keyboard("{Tab}");

		await waitFor(() => {
			const nodes = document.querySelectorAll(".react-flow__node");
			expect(nodes).toHaveLength(2);
		});
		expect(useGraphStore.getState().dependencies).toHaveLength(1);
	});

	it("creates a sibling with Enter when a non-root node is selected", async () => {
		const user = userEvent.setup();
		render(<App />);

		// Create goal
		await user.dblClick(getCanvas());
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});
		await user.keyboard("Goal{Enter}");
		await waitFor(() => {
			expect(screen.getByText("Goal")).toBeInTheDocument();
		});

		// Create subtask via Tab
		selectNode(getGoalId());
		await user.keyboard("{Tab}");
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});
		await user.keyboard("Sub 1{Enter}");
		await waitFor(() => {
			expect(screen.getByText("Sub 1")).toBeInTheDocument();
		});

		// Select Sub 1, press Enter to create sibling
		selectNode(useGraphStore.getState().tasks[1].id);
		await user.keyboard("{Enter}");

		await waitFor(() => {
			const nodes = document.querySelectorAll(".react-flow__node");
			expect(nodes).toHaveLength(3);
			expect(useGraphStore.getState().dependencies).toHaveLength(2);
		});
	});

	it("enters edit mode with 'e' key when a node is selected", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.dblClick(getCanvas());
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});
		await user.keyboard("Goal{Enter}");
		await waitFor(() => {
			expect(screen.getByText("Goal")).toBeInTheDocument();
		});

		selectNode(getGoalId());
		await user.keyboard("e");

		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});
	});

	it("enters edit mode with F2 when a node is selected", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.dblClick(getCanvas());
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});
		await user.keyboard("Goal{Enter}");
		await waitFor(() => {
			expect(screen.getByText("Goal")).toBeInTheDocument();
		});

		selectNode(getGoalId());
		await user.keyboard("{F2}");

		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});
	});

	it("does nothing on Enter when root node is selected", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.dblClick(getCanvas());
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});
		await user.keyboard("Goal{Enter}");
		await waitFor(() => {
			expect(screen.getByText("Goal")).toBeInTheDocument();
		});

		selectNode(getGoalId());
		await user.keyboard("{Enter}");

		await waitFor(() => {
			const nodes = document.querySelectorAll(".react-flow__node");
			expect(nodes).toHaveLength(1);
		});
	});

	it("displays controls panel", () => {
		render(<App />);

		const controls = document.querySelector(".react-flow__controls");
		expect(controls).toBeInTheDocument();
	});

	it("displays background pattern", () => {
		render(<App />);

		const background = document.querySelector(".react-flow__background");
		expect(background).toBeInTheDocument();
	});
});
