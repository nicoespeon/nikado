import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import type { TaskId, TaskLabel } from "./model/graph";
import { resetMarkdownCopy } from "./hooks/use-copy-markdown";
import { resetShare } from "./hooks/use-share";
import { serializeGraph } from "./model/url";
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
		movingNodeId: null,
		past: [],
		future: [],
		canUndo: false,
		canRedo: false,
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

function getNodeByText(text: string) {
	const node = screen.getByText(text).closest(".react-flow__node");
	if (!node) throw new Error(`Node containing "${text}" not found`);
	return node;
}

function getDoneButton(node: Element) {
	const button = node.querySelector(
		'button[aria-label="Mark done"], button[aria-label="Mark undone"]',
	);
	if (!button) throw new Error("Done button not found");
	return button;
}

describe("App", () => {
	afterEach(() => {
		cleanup();
		resetStore();
		resetMarkdownCopy();
		resetShare();
		document.title = "Nikado";
		window.history.replaceState(null, "", window.location.pathname);
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

	it("deletes a new goal on Escape when label is still the placeholder", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.dblClick(getCanvas());
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});

		await user.keyboard("{Escape}");

		await waitFor(() => {
			expect(document.querySelectorAll(".react-flow__node")).toHaveLength(0);
		});
		expect(useGraphStore.getState().goalId).toBeNull();
		expect(useGraphStore.getState().selectedNodeId).toBeNull();
	});

	it("deletes a new sub-task on Escape and selects the parent node", async () => {
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
			const labels = screen.getAllByLabelText("Task label");
			expect(labels).toHaveLength(1);
		});

		await user.keyboard("{Escape}");

		await waitFor(() => {
			expect(document.querySelectorAll(".react-flow__node")).toHaveLength(1);
		});
		expect(useGraphStore.getState().tasks).toHaveLength(1);
		expect(useGraphStore.getState().selectedNodeId).toBe(getGoalId());
	});

	it("keeps existing label on Escape when editing a saved task", async () => {
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
		await user.keyboard("e");
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});

		await user.keyboard("{Escape}");

		await waitFor(() => {
			expect(screen.getByText("My Goal")).toBeInTheDocument();
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

	it("deselects the selected node when pressing Escape", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.dblClick(getCanvas());
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});
		await user.keyboard("Goal{Enter}");
		await waitFor(() => expect(screen.getByText("Goal")).toBeInTheDocument());

		selectNode(getGoalId());
		expect(useGraphStore.getState().selectedNodeId).toBe(getGoalId());

		await user.keyboard("{Escape}");

		expect(useGraphStore.getState().selectedNodeId).toBeNull();
	});

	it("does not enter edit mode when Space is held (user intent is to pan)", async () => {
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

		fireEvent.keyDown(window, { key: " " });
		fireEvent.keyDown(window, { key: " ", repeat: true });
		fireEvent.keyUp(window, { key: " " });

		expect(useGraphStore.getState().editingNodeId).toBeNull();
	});

	it("edits the selected sub-node (not the goal) when pressing Space", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.dblClick(getCanvas());
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});
		await user.keyboard("Goal{Enter}");
		await waitFor(() => expect(screen.getByText("Goal")).toBeInTheDocument());

		selectNode(getGoalId());
		await user.keyboard("{Tab}");
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});
		await user.keyboard("Child{Enter}");
		await waitFor(() => expect(screen.getByText("Child")).toBeInTheDocument());

		const childId = useGraphStore.getState().tasks[1].id;
		selectNode(childId);
		await user.keyboard(" ");

		await waitFor(() => {
			expect(useGraphStore.getState().editingNodeId).toBe(childId);
		});
	});

	it("enters edit mode on double-click of a node", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.dblClick(getCanvas());
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});
		await user.keyboard("Goal{Enter}");
		await waitFor(() => expect(screen.getByText("Goal")).toBeInTheDocument());

		selectNode(getGoalId());
		await user.keyboard("{Tab}");
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});
		await user.keyboard("Child{Enter}");
		await waitFor(() => expect(screen.getByText("Child")).toBeInTheDocument());

		// fireEvent avoids d3-drag's mousedown handler that errors in jsdom
		const childNode = getNodeByText("Child");
		fireEvent.dblClick(childNode);

		const childId = useGraphStore.getState().tasks[1].id;
		await waitFor(() => {
			expect(useGraphStore.getState().editingNodeId).toBe(childId);
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

	it("expands a collapsed node when Tab creates a sub-task", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.dblClick(getCanvas());
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});
		await user.keyboard("Goal{Enter}");
		await waitFor(() => expect(screen.getByText("Goal")).toBeInTheDocument());

		// Create a child
		selectNode(getGoalId());
		await user.keyboard("{Tab}");
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});
		await user.keyboard("Child{Enter}");
		await waitFor(() => expect(screen.getByText("Child")).toBeInTheDocument());

		// Collapse the goal
		const goalId = getGoalId();
		useGraphStore.getState().collapseNode(goalId);
		await waitFor(() => {
			expect(screen.queryByText("Child")).not.toBeInTheDocument();
		});

		// Tab on collapsed goal should expand it and create a new sub-task
		selectNode(goalId);
		await user.keyboard("{Tab}");
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});
		await user.keyboard("New Child{Enter}");
		await waitFor(() => {
			expect(screen.getByText("New Child")).toBeInTheDocument();
		});

		// Both children should be visible (node was expanded)
		expect(screen.getByText("Child")).toBeInTheDocument();
		expect(useGraphStore.getState().collapsedNodes.has(goalId)).toBe(false);
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

		expect(screen.getByTitle("Zoom in (+)")).toBeInTheDocument();
		expect(screen.getByTitle("Zoom out (-)")).toBeInTheDocument();
		expect(screen.getByTitle("Fit view (0)")).toBeInTheDocument();
	});

	it("displays background pattern", () => {
		render(<App />);

		const background = document.querySelector(".react-flow__background");
		expect(background).toBeInTheDocument();
	});

	it("marks a leaf task done via status control", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.dblClick(getCanvas());
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});
		await user.keyboard("Goal{Enter}");
		await waitFor(() => expect(screen.getByText("Goal")).toBeInTheDocument());

		selectNode(getGoalId());
		await user.keyboard("{Tab}");
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});
		await user.keyboard("Leaf{Enter}");
		await waitFor(() => expect(screen.getByText("Leaf")).toBeInTheDocument());

		await user.click(getDoneButton(getNodeByText("Leaf")));

		await waitFor(() => {
			expect(useGraphStore.getState().tasks[1].status).toBe("done");
		});
	});

	it("cascades done to children when marking parent done", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.dblClick(getCanvas());
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});
		await user.keyboard("Goal{Enter}");
		await waitFor(() => expect(screen.getByText("Goal")).toBeInTheDocument());

		selectNode(getGoalId());
		await user.keyboard("{Tab}");
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});
		await user.keyboard("Child{Enter}");
		await waitFor(() => expect(screen.getByText("Child")).toBeInTheDocument());

		await user.click(getDoneButton(getNodeByText("Goal")));

		await waitFor(() => {
			const { tasks } = useGraphStore.getState();
			expect(tasks[0].status).toBe("done");
			expect(tasks[1].status).toBe("done");
		});
	});

	it("shows 'Nikado' as tab title when no goal exists", () => {
		render(<App />);

		expect(document.title).toBe("Nikado");
	});

	it("shows goal label in tab title", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.dblClick(getCanvas());
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});
		await user.keyboard("Migrate to React 19{Enter}");

		await waitFor(() => {
			expect(document.title).toBe("Migrate to React 19 | Nikado");
		});
	});

	it("trims long goal labels in tab title", async () => {
		const user = userEvent.setup();
		render(<App />);

		const longLabel = "A".repeat(60);
		await user.dblClick(getCanvas());
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});
		await user.keyboard(`${longLabel}{Enter}`);

		await waitFor(() => {
			expect(document.title).toBe(`${"A".repeat(50)}\u2026 | Nikado`);
		});
	});

	it("highlights pending leaf tasks as actionable", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.dblClick(getCanvas());
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});
		await user.keyboard("Goal{Enter}");
		await waitFor(() => expect(screen.getByText("Goal")).toBeInTheDocument());

		selectNode(getGoalId());
		await user.keyboard("{Tab}");
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});
		await user.keyboard("Leaf{Enter}");
		await waitFor(() => expect(screen.getByText("Leaf")).toBeInTheDocument());

		const leafNode = getNodeByText("Leaf");
		const leafWrapper = leafNode.querySelector("[data-leaf='true']");
		expect(leafWrapper).toBeInTheDocument();
		expect(leafWrapper).toHaveAttribute("data-status", "pending");
	});

	it("marks selected node done with 'd' keyboard shortcut", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.dblClick(getCanvas());
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});
		await user.keyboard("Goal{Enter}");
		await waitFor(() => expect(screen.getByText("Goal")).toBeInTheDocument());

		selectNode(getGoalId());
		await user.keyboard("d");

		await waitFor(() => {
			expect(useGraphStore.getState().tasks[0].status).toBe("done");
		});
	});

	it("toggles done back to pending with 'd' without affecting children", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.dblClick(getCanvas());
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});
		await user.keyboard("Goal{Enter}");
		await waitFor(() => expect(screen.getByText("Goal")).toBeInTheDocument());

		selectNode(getGoalId());
		await user.keyboard("{Tab}");
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});
		await user.keyboard("Child{Enter}");
		await waitFor(() => expect(screen.getByText("Child")).toBeInTheDocument());

		// Mark goal done (cascades to child)
		selectNode(getGoalId());
		await user.keyboard("d");
		await waitFor(() => {
			expect(useGraphStore.getState().tasks[0].status).toBe("done");
			expect(useGraphStore.getState().tasks[1].status).toBe("done");
		});

		// Toggle goal back to pending (child stays done)
		await user.keyboard("d");
		await waitFor(() => {
			expect(useGraphStore.getState().tasks[0].status).toBe("pending");
			expect(useGraphStore.getState().tasks[1].status).toBe("done");
		});
	});

	it("deletes a leaf task with Delete key", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.dblClick(getCanvas());
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});
		await user.keyboard("Goal{Enter}");
		await waitFor(() => expect(screen.getByText("Goal")).toBeInTheDocument());

		selectNode(getGoalId());
		await user.keyboard("{Tab}");
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});
		await user.keyboard("Leaf{Enter}");
		await waitFor(() => expect(screen.getByText("Leaf")).toBeInTheDocument());

		selectNode(useGraphStore.getState().tasks[1].id);
		await user.keyboard("{Delete}");

		await waitFor(() => {
			expect(useGraphStore.getState().tasks).toHaveLength(1);
			expect(screen.queryByText("Leaf")).not.toBeInTheDocument();
			expect(screen.getByText("Goal")).toBeInTheDocument();
			expect(useGraphStore.getState().selectedNodeId).toBe(getGoalId());
		});
	});

	it("deletes a task with sub-tasks, cascade-deleting the sub-tree", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.dblClick(getCanvas());
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});
		await user.keyboard("Goal{Enter}");
		await waitFor(() => expect(screen.getByText("Goal")).toBeInTheDocument());

		// Create: Goal > Middle > Leaf
		selectNode(getGoalId());
		await user.keyboard("{Tab}");
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});
		await user.keyboard("Middle{Enter}");
		await waitFor(() => expect(screen.getByText("Middle")).toBeInTheDocument());

		selectNode(useGraphStore.getState().tasks[1].id);
		await user.keyboard("{Tab}");
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});
		await user.keyboard("Leaf{Enter}");
		await waitFor(() => expect(screen.getByText("Leaf")).toBeInTheDocument());

		// Delete Middle: should also remove Leaf
		selectNode(useGraphStore.getState().tasks[1].id);
		await user.keyboard("{Delete}");

		await waitFor(() => {
			expect(useGraphStore.getState().tasks).toHaveLength(1);
			expect(screen.queryByText("Middle")).not.toBeInTheDocument();
			expect(screen.queryByText("Leaf")).not.toBeInTheDocument();
			expect(screen.getByText("Goal")).toBeInTheDocument();
			expect(useGraphStore.getState().selectedNodeId).toBe(getGoalId());
		});
	});

	it("deletes the goal, clearing the entire graph", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.dblClick(getCanvas());
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});
		await user.keyboard("Goal{Enter}");
		await waitFor(() => expect(screen.getByText("Goal")).toBeInTheDocument());

		selectNode(getGoalId());
		await user.keyboard("{Tab}");
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});
		await user.keyboard("Child{Enter}");
		await waitFor(() => expect(screen.getByText("Child")).toBeInTheDocument());

		selectNode(getGoalId());
		await user.keyboard("{Delete}");

		await waitFor(() => {
			expect(useGraphStore.getState().goalId).toBeNull();
			expect(useGraphStore.getState().tasks).toHaveLength(0);
			expect(useGraphStore.getState().selectedNodeId).toBeNull();
			expect(
				screen.getByText(/double-click or press space to create your goal/i),
			).toBeInTheDocument();
		});
	});

	it("deletes a task with Backspace", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.dblClick(getCanvas());
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});
		await user.keyboard("Goal{Enter}");
		await waitFor(() => expect(screen.getByText("Goal")).toBeInTheDocument());

		selectNode(getGoalId());
		await user.keyboard("{Backspace}");

		await waitFor(() => {
			expect(useGraphStore.getState().goalId).toBeNull();
			expect(useGraphStore.getState().tasks).toHaveLength(0);
		});
	});

	describe("arrow key navigation", () => {
		it("selects the goal when pressing an arrow key with no selection", async () => {
			const user = userEvent.setup();
			render(<App />);

			await user.dblClick(getCanvas());
			await waitFor(() => {
				expect(screen.getByLabelText("Task label")).toBeInTheDocument();
			});
			await user.keyboard("Goal{Enter}");
			await waitFor(() => expect(screen.getByText("Goal")).toBeInTheDocument());

			await user.keyboard("{ArrowDown}");

			expect(useGraphStore.getState().selectedNodeId).toBe(getGoalId());
		});

		it("navigates to first child with ArrowRight", async () => {
			const user = userEvent.setup();
			render(<App />);

			await user.dblClick(getCanvas());
			await waitFor(() => {
				expect(screen.getByLabelText("Task label")).toBeInTheDocument();
			});
			await user.keyboard("Goal{Enter}");
			await waitFor(() => expect(screen.getByText("Goal")).toBeInTheDocument());

			selectNode(getGoalId());
			await user.keyboard("{Tab}");
			await waitFor(() => {
				expect(screen.getByLabelText("Task label")).toBeInTheDocument();
			});
			await user.keyboard("Child{Enter}");
			await waitFor(() =>
				expect(screen.getByText("Child")).toBeInTheDocument(),
			);

			selectNode(getGoalId());
			await user.keyboard("{ArrowRight}");

			const childId = useGraphStore.getState().tasks[1].id;
			expect(useGraphStore.getState().selectedNodeId).toBe(childId);
		});

		it("navigates to parent with ArrowLeft", async () => {
			const user = userEvent.setup();
			render(<App />);

			await user.dblClick(getCanvas());
			await waitFor(() => {
				expect(screen.getByLabelText("Task label")).toBeInTheDocument();
			});
			await user.keyboard("Goal{Enter}");
			await waitFor(() => expect(screen.getByText("Goal")).toBeInTheDocument());

			selectNode(getGoalId());
			await user.keyboard("{Tab}");
			await waitFor(() => {
				expect(screen.getByLabelText("Task label")).toBeInTheDocument();
			});
			await user.keyboard("Child{Enter}");
			await waitFor(() =>
				expect(screen.getByText("Child")).toBeInTheDocument(),
			);

			const childId = useGraphStore.getState().tasks[1].id;
			selectNode(childId);
			await user.keyboard("{ArrowLeft}");

			expect(useGraphStore.getState().selectedNodeId).toBe(getGoalId());
		});

		it("navigates between siblings with ArrowUp/ArrowDown and wraps", async () => {
			const user = userEvent.setup();
			render(<App />);

			await user.dblClick(getCanvas());
			await waitFor(() => {
				expect(screen.getByLabelText("Task label")).toBeInTheDocument();
			});
			await user.keyboard("Goal{Enter}");
			await waitFor(() => expect(screen.getByText("Goal")).toBeInTheDocument());

			// Create two children
			selectNode(getGoalId());
			await user.keyboard("{Tab}");
			await waitFor(() => {
				expect(screen.getByLabelText("Task label")).toBeInTheDocument();
			});
			await user.keyboard("Child A{Enter}");
			await waitFor(() =>
				expect(screen.getByText("Child A")).toBeInTheDocument(),
			);

			selectNode(getGoalId());
			await user.keyboard("{Tab}");
			await waitFor(() => {
				expect(screen.getByLabelText("Task label")).toBeInTheDocument();
			});
			await user.keyboard("Child B{Enter}");
			await waitFor(() =>
				expect(screen.getByText("Child B")).toBeInTheDocument(),
			);

			const childAId = useGraphStore.getState().tasks[1].id;
			const childBId = useGraphStore.getState().tasks[2].id;

			// ArrowDown from A goes to B
			selectNode(childAId);
			await user.keyboard("{ArrowDown}");
			expect(useGraphStore.getState().selectedNodeId).toBe(childBId);

			// ArrowDown from B wraps to A
			await user.keyboard("{ArrowDown}");
			expect(useGraphStore.getState().selectedNodeId).toBe(childAId);

			// ArrowUp from A wraps to B
			await user.keyboard("{ArrowUp}");
			expect(useGraphStore.getState().selectedNodeId).toBe(childBId);
		});

		it("does nothing when pressing arrow keys with no goal", async () => {
			const user = userEvent.setup();
			render(<App />);

			await user.keyboard("{ArrowDown}");

			expect(useGraphStore.getState().selectedNodeId).toBeNull();
		});
	});

	describe("reorder siblings", () => {
		it("moves a sibling up with Alt+ArrowUp", async () => {
			const user = userEvent.setup();
			render(<App />);

			await user.dblClick(getCanvas());
			await waitFor(() => {
				expect(screen.getByLabelText("Task label")).toBeInTheDocument();
			});
			await user.keyboard("Goal{Enter}");
			await waitFor(() => expect(screen.getByText("Goal")).toBeInTheDocument());

			selectNode(getGoalId());
			await user.keyboard("{Tab}");
			await waitFor(() => {
				expect(screen.getByLabelText("Task label")).toBeInTheDocument();
			});
			await user.keyboard("A{Enter}");
			await waitFor(() => expect(screen.getByText("A")).toBeInTheDocument());

			selectNode(getGoalId());
			await user.keyboard("{Tab}");
			await waitFor(() => {
				expect(screen.getByLabelText("Task label")).toBeInTheDocument();
			});
			await user.keyboard("B{Enter}");
			await waitFor(() => expect(screen.getByText("B")).toBeInTheDocument());

			const childBId = useGraphStore.getState().tasks[2].id;
			selectNode(childBId);

			await user.keyboard("{Alt>}{ArrowUp}{/Alt}");

			const state = useGraphStore.getState();
			const goalChildren = state.dependencies
				.filter((d) => d.from === state.goalId)
				.map((d) => d.to);
			expect(goalChildren).toEqual([childBId, state.tasks[1].id]);
			expect(state.selectedNodeId).toBe(childBId);
		});

		it("moves a sibling down with Alt+ArrowDown", async () => {
			const user = userEvent.setup();
			render(<App />);

			await user.dblClick(getCanvas());
			await waitFor(() => {
				expect(screen.getByLabelText("Task label")).toBeInTheDocument();
			});
			await user.keyboard("Goal{Enter}");
			await waitFor(() => expect(screen.getByText("Goal")).toBeInTheDocument());

			selectNode(getGoalId());
			await user.keyboard("{Tab}");
			await waitFor(() => {
				expect(screen.getByLabelText("Task label")).toBeInTheDocument();
			});
			await user.keyboard("A{Enter}");
			await waitFor(() => expect(screen.getByText("A")).toBeInTheDocument());

			selectNode(getGoalId());
			await user.keyboard("{Tab}");
			await waitFor(() => {
				expect(screen.getByLabelText("Task label")).toBeInTheDocument();
			});
			await user.keyboard("B{Enter}");
			await waitFor(() => expect(screen.getByText("B")).toBeInTheDocument());

			const childAId = useGraphStore.getState().tasks[1].id;
			selectNode(childAId);

			await user.keyboard("{Alt>}{ArrowDown}{/Alt}");

			const state = useGraphStore.getState();
			const goalChildren = state.dependencies
				.filter((d) => d.from === state.goalId)
				.map((d) => d.to);
			expect(goalChildren).toEqual([state.tasks[2].id, childAId]);
			expect(state.selectedNodeId).toBe(childAId);
		});

		it("does nothing when Alt+ArrowUp on first sibling", async () => {
			const user = userEvent.setup();
			render(<App />);

			await user.dblClick(getCanvas());
			await waitFor(() => {
				expect(screen.getByLabelText("Task label")).toBeInTheDocument();
			});
			await user.keyboard("Goal{Enter}");
			await waitFor(() => expect(screen.getByText("Goal")).toBeInTheDocument());

			selectNode(getGoalId());
			await user.keyboard("{Tab}");
			await waitFor(() => {
				expect(screen.getByLabelText("Task label")).toBeInTheDocument();
			});
			await user.keyboard("A{Enter}");
			await waitFor(() => expect(screen.getByText("A")).toBeInTheDocument());

			selectNode(getGoalId());
			await user.keyboard("{Tab}");
			await waitFor(() => {
				expect(screen.getByLabelText("Task label")).toBeInTheDocument();
			});
			await user.keyboard("B{Enter}");
			await waitFor(() => expect(screen.getByText("B")).toBeInTheDocument());

			const childAId = useGraphStore.getState().tasks[1].id;
			const depsBefore = useGraphStore.getState().dependencies;
			selectNode(childAId);

			await user.keyboard("{Alt>}{ArrowUp}{/Alt}");

			expect(useGraphStore.getState().dependencies).toEqual(depsBefore);
		});
	});

	describe("insert parent", () => {
		it("Shift+Tab creates a new parent and enters edit mode", async () => {
			const user = userEvent.setup();
			render(<App />);

			await user.dblClick(getCanvas());
			await waitFor(() => {
				expect(screen.getByLabelText("Task label")).toBeInTheDocument();
			});
			await user.keyboard("Goal{Enter}");
			await waitFor(() => expect(screen.getByText("Goal")).toBeInTheDocument());

			selectNode(getGoalId());
			await user.keyboard("{Tab}");
			await waitFor(() => {
				expect(screen.getByLabelText("Task label")).toBeInTheDocument();
			});
			await user.keyboard("Child{Enter}");
			await waitFor(() =>
				expect(screen.getByText("Child")).toBeInTheDocument(),
			);

			const childId = useGraphStore.getState().tasks[1].id;
			selectNode(childId);
			await user.keyboard("{Shift>}{Tab}{/Shift}");

			await waitFor(() => {
				const nodes = document.querySelectorAll(".react-flow__node");
				expect(nodes).toHaveLength(3);
			});
			expect(useGraphStore.getState().editingNodeId).not.toBeNull();
			expect(useGraphStore.getState().editingNodeId).not.toBe(childId);
		});

		it("new parent appears between the old parent and the task", async () => {
			const user = userEvent.setup();
			render(<App />);

			await user.dblClick(getCanvas());
			await waitFor(() => {
				expect(screen.getByLabelText("Task label")).toBeInTheDocument();
			});
			await user.keyboard("Goal{Enter}");
			await waitFor(() => expect(screen.getByText("Goal")).toBeInTheDocument());

			selectNode(getGoalId());
			await user.keyboard("{Tab}");
			await waitFor(() => {
				expect(screen.getByLabelText("Task label")).toBeInTheDocument();
			});
			await user.keyboard("Child{Enter}");
			await waitFor(() =>
				expect(screen.getByText("Child")).toBeInTheDocument(),
			);

			const childId = useGraphStore.getState().tasks[1].id;
			selectNode(childId);
			await user.keyboard("{Shift>}{Tab}{/Shift}");

			await waitFor(() => {
				const state = useGraphStore.getState();
				const newParentId = state.editingNodeId;
				expect(newParentId).not.toBeNull();
				// Goal -> newParent -> Child
				expect(
					state.dependencies.find(
						(d) => d.from === state.goalId && d.to === newParentId,
					),
				).toBeTruthy();
				expect(
					state.dependencies.find(
						(d) => d.from === newParentId && d.to === childId,
					),
				).toBeTruthy();
			});
		});

		it("does nothing on Shift+Tab when goal is selected", async () => {
			const user = userEvent.setup();
			render(<App />);

			await user.dblClick(getCanvas());
			await waitFor(() => {
				expect(screen.getByLabelText("Task label")).toBeInTheDocument();
			});
			await user.keyboard("Goal{Enter}");
			await waitFor(() => expect(screen.getByText("Goal")).toBeInTheDocument());

			selectNode(getGoalId());
			await user.keyboard("{Shift>}{Tab}{/Shift}");

			await waitFor(() => {
				const nodes = document.querySelectorAll(".react-flow__node");
				expect(nodes).toHaveLength(1);
			});
			expect(useGraphStore.getState().editingNodeId).toBeNull();
		});
	});

	describe("context menu", () => {
		it("shows Edit action on right-click of a node", async () => {
			const user = userEvent.setup();
			render(<App />);

			await user.dblClick(getCanvas());
			await waitFor(() => {
				expect(screen.getByLabelText("Task label")).toBeInTheDocument();
			});
			await user.keyboard("Goal{Enter}");
			await waitFor(() => expect(screen.getByText("Goal")).toBeInTheDocument());

			const goalNode = getNodeByText("Goal");
			await user.pointer({ keys: "[MouseRight]", target: goalNode });

			await waitFor(() => {
				expect(
					screen.getByRole("menuitem", { name: "Edit" }),
				).toBeInTheDocument();
			});
		});

		it("Edit action enters edit mode for the right-clicked node", async () => {
			const user = userEvent.setup();
			render(<App />);

			await user.dblClick(getCanvas());
			await waitFor(() => {
				expect(screen.getByLabelText("Task label")).toBeInTheDocument();
			});
			await user.keyboard("Goal{Enter}");
			await waitFor(() => expect(screen.getByText("Goal")).toBeInTheDocument());

			selectNode(getGoalId());
			await user.keyboard("{Tab}");
			await waitFor(() => {
				expect(screen.getByLabelText("Task label")).toBeInTheDocument();
			});
			await user.keyboard("Child{Enter}");
			await waitFor(() =>
				expect(screen.getByText("Child")).toBeInTheDocument(),
			);

			const childNode = getNodeByText("Child");
			await user.pointer({ keys: "[MouseRight]", target: childNode });

			await waitFor(() => {
				expect(
					screen.getByRole("menuitem", { name: "Edit" }),
				).toBeInTheDocument();
			});

			const childId = useGraphStore.getState().tasks[1].id;
			await user.click(screen.getByRole("menuitem", { name: "Edit" }));

			await waitFor(() => {
				expect(useGraphStore.getState().editingNodeId).toBe(childId);
			});
		});
	});

	describe("URL state persistence", () => {
		it("updates URL hash after creating a goal", async () => {
			const user = userEvent.setup();
			render(<App />);

			await user.dblClick(getCanvas());
			await waitFor(() => {
				expect(screen.getByLabelText("Task label")).toBeInTheDocument();
			});
			await user.keyboard("My Goal{Enter}");
			await waitFor(() =>
				expect(screen.getByText("My Goal")).toBeInTheDocument(),
			);

			await waitFor(() => {
				expect(window.location.hash).not.toBe("");
			});
		});

		it("restores graph from URL hash on mount", async () => {
			const graph = {
				goalId: "test-id" as TaskId,
				tasks: [
					{
						id: "test-id" as TaskId,
						label: "Restored Goal" as TaskLabel,
						status: "pending" as const,
					},
				],
				dependencies: [],
			};
			window.history.replaceState(null, "", `#${serializeGraph(graph)}`);

			render(<App />);

			await waitFor(() => {
				expect(screen.getByText("Restored Goal")).toBeInTheDocument();
			});
		});

		it("shows empty canvas for malformed URL hash", () => {
			window.location.hash = "#garbage-data";

			render(<App />);

			expect(
				screen.getByText(/double-click or press space to create your goal/i),
			).toBeInTheDocument();
		});

		it("shows empty canvas for empty URL hash", () => {
			render(<App />);

			expect(
				screen.getByText(/double-click or press space to create your goal/i),
			).toBeInTheDocument();
		});
	});

	describe("Copy as text button", () => {
		it("is disabled when the graph is empty", () => {
			render(<App />);

			expect(
				screen.getByRole("button", { name: "Copy as text (C)" }),
			).toBeDisabled();
		});

		it("copies markdown to clipboard", async () => {
			const writeText = vi
				.spyOn(navigator.clipboard, "writeText")
				.mockResolvedValue(undefined);
			const user = userEvent.setup();
			render(<App />);

			await user.dblClick(getCanvas());
			await waitFor(() => {
				expect(screen.getByLabelText("Task label")).toBeInTheDocument();
			});
			await user.keyboard("Goal{Enter}");
			await waitFor(() => expect(screen.getByText("Goal")).toBeInTheDocument());

			await user.click(
				screen.getByRole("button", { name: "Copy as text (C)" }),
			);

			expect(writeText).toHaveBeenCalledWith("- [ ] Goal");
			writeText.mockRestore();
		});

		it("shows confirmation feedback after copying", async () => {
			const writeText = vi
				.spyOn(navigator.clipboard, "writeText")
				.mockResolvedValue(undefined);
			const user = userEvent.setup();
			render(<App />);

			await user.dblClick(getCanvas());
			await waitFor(() => {
				expect(screen.getByLabelText("Task label")).toBeInTheDocument();
			});
			await user.keyboard("Goal{Enter}");
			await waitFor(() => expect(screen.getByText("Goal")).toBeInTheDocument());

			await user.click(
				screen.getByRole("button", { name: "Copy as text (C)" }),
			);

			await waitFor(() => {
				expect(screen.getByText("Copied as text!")).toBeInTheDocument();
			});

			await waitFor(
				() => {
					expect(screen.queryByText("Copied as text!")).not.toBeInTheDocument();
				},
				{ timeout: 3000 },
			);
			writeText.mockRestore();
		});
	});

	describe("Share button", () => {
		it("is disabled when the graph is empty", () => {
			render(<App />);

			expect(screen.getByRole("button", { name: "Share (S)" })).toBeDisabled();
		});

		it("copies current URL to clipboard", async () => {
			const writeText = vi
				.spyOn(navigator.clipboard, "writeText")
				.mockResolvedValue(undefined);
			const user = userEvent.setup();
			render(<App />);

			await user.dblClick(getCanvas());
			await waitFor(() => {
				expect(screen.getByLabelText("Task label")).toBeInTheDocument();
			});
			await user.keyboard("Goal{Enter}");
			await waitFor(() => expect(screen.getByText("Goal")).toBeInTheDocument());

			await user.click(screen.getByRole("button", { name: "Share (S)" }));

			expect(writeText).toHaveBeenCalledWith(window.location.href);
			writeText.mockRestore();
		});

		it("shows confirmation feedback after copying", async () => {
			const writeText = vi
				.spyOn(navigator.clipboard, "writeText")
				.mockResolvedValue(undefined);
			const user = userEvent.setup();
			render(<App />);

			await user.dblClick(getCanvas());
			await waitFor(() => {
				expect(screen.getByLabelText("Task label")).toBeInTheDocument();
			});
			await user.keyboard("Goal{Enter}");
			await waitFor(() => expect(screen.getByText("Goal")).toBeInTheDocument());

			await user.click(screen.getByRole("button", { name: "Share (S)" }));

			await waitFor(() => {
				expect(screen.getByText("Link copied!")).toBeInTheDocument();
			});

			await waitFor(
				() => {
					expect(screen.queryByText("Link copied!")).not.toBeInTheDocument();
				},
				{ timeout: 3000 },
			);
			writeText.mockRestore();
		});
	});

	describe("mobile", () => {
		function mockMobileMatchMedia() {
			const originalMatchMedia = window.matchMedia;
			Object.defineProperty(window, "matchMedia", {
				value: (query: string) => ({
					matches: query === "(max-width: 767px)",
					media: query,
					onchange: null,
					addListener() {
						// do nothing
					},
					removeListener() {
						// do nothing
					},
					addEventListener() {
						// do nothing
					},
					removeEventListener() {
						// do nothing
					},
					dispatchEvent: () => false,
				}),
				writable: true,
				configurable: true,
			});
			return () => {
				Object.defineProperty(window, "matchMedia", {
					value: originalMatchMedia,
					writable: true,
					configurable: true,
				});
			};
		}

		it("renders outline view instead of graph on mobile", () => {
			const restore = mockMobileMatchMedia();

			useGraphStore.getState().createGoal("Mobile goal");
			render(<App />);

			expect(screen.getByRole("tree")).toBeInTheDocument();
			expect(screen.getByText("Mobile goal")).toBeInTheDocument();
			expect(document.querySelector(".react-flow")).not.toBeInTheDocument();

			restore();
		});

		it("shows create goal button on mobile empty state", () => {
			const restore = mockMobileMatchMedia();

			render(<App />);

			expect(
				screen.getByRole("button", { name: "Create goal" }),
			).toBeInTheDocument();
			expect(document.querySelector(".react-flow")).not.toBeInTheDocument();

			restore();
		});
	});

	describe("move task", () => {
		it("m key enters move mode, Enter confirms move", async () => {
			const user = userEvent.setup();
			render(<App />);

			await user.dblClick(getCanvas());
			await waitFor(() => {
				expect(screen.getByLabelText("Task label")).toBeInTheDocument();
			});
			await user.keyboard("Goal{Enter}");
			await waitFor(() => expect(screen.getByText("Goal")).toBeInTheDocument());

			selectNode(getGoalId());
			await user.keyboard("{Tab}");
			await waitFor(() => {
				expect(screen.getByLabelText("Task label")).toBeInTheDocument();
			});
			await user.keyboard("A{Enter}");
			await waitFor(() => expect(screen.getByText("A")).toBeInTheDocument());

			selectNode(getGoalId());
			await user.keyboard("{Tab}");
			await waitFor(() => {
				expect(screen.getByLabelText("Task label")).toBeInTheDocument();
			});
			await user.keyboard("B{Enter}");
			await waitFor(() => expect(screen.getByText("B")).toBeInTheDocument());

			const childAId = useGraphStore.getState().tasks[1].id;
			const childBId = useGraphStore.getState().tasks[2].id;
			selectNode(childAId);

			await user.keyboard("m");

			expect(useGraphStore.getState().movingNodeId).toBe(childAId);

			selectNode(childBId);
			await user.keyboard("{Enter}");

			const state = useGraphStore.getState();
			expect(state.movingNodeId).toBeNull();
			const bChildren = state.dependencies
				.filter((d) => d.from === childBId)
				.map((d) => d.to);
			expect(bChildren).toContain(childAId);
		});

		it("Escape cancels move mode", async () => {
			const user = userEvent.setup();
			render(<App />);

			await user.dblClick(getCanvas());
			await waitFor(() => {
				expect(screen.getByLabelText("Task label")).toBeInTheDocument();
			});
			await user.keyboard("Goal{Enter}");
			await waitFor(() => expect(screen.getByText("Goal")).toBeInTheDocument());

			selectNode(getGoalId());
			await user.keyboard("{Tab}");
			await waitFor(() => {
				expect(screen.getByLabelText("Task label")).toBeInTheDocument();
			});
			await user.keyboard("A{Enter}");
			await waitFor(() => expect(screen.getByText("A")).toBeInTheDocument());

			const childAId = useGraphStore.getState().tasks[1].id;
			selectNode(childAId);

			await user.keyboard("m");
			expect(useGraphStore.getState().movingNodeId).toBe(childAId);

			await user.keyboard("{Escape}");
			expect(useGraphStore.getState().movingNodeId).toBeNull();
		});

		it("move is undoable", async () => {
			const user = userEvent.setup();
			render(<App />);

			await user.dblClick(getCanvas());
			await waitFor(() => {
				expect(screen.getByLabelText("Task label")).toBeInTheDocument();
			});
			await user.keyboard("Goal{Enter}");
			await waitFor(() => expect(screen.getByText("Goal")).toBeInTheDocument());

			selectNode(getGoalId());
			await user.keyboard("{Tab}");
			await waitFor(() => {
				expect(screen.getByLabelText("Task label")).toBeInTheDocument();
			});
			await user.keyboard("A{Enter}");
			await waitFor(() => expect(screen.getByText("A")).toBeInTheDocument());

			selectNode(getGoalId());
			await user.keyboard("{Tab}");
			await waitFor(() => {
				expect(screen.getByLabelText("Task label")).toBeInTheDocument();
			});
			await user.keyboard("B{Enter}");
			await waitFor(() => expect(screen.getByText("B")).toBeInTheDocument());

			const goalId = getGoalId();
			const childAId = useGraphStore.getState().tasks[1].id;
			const childBId = useGraphStore.getState().tasks[2].id;

			selectNode(childAId);
			await user.keyboard("m");
			selectNode(childBId);
			await user.keyboard("{Enter}");

			const movedChildren = useGraphStore
				.getState()
				.dependencies.filter((d) => d.from === childBId)
				.map((d) => d.to);
			expect(movedChildren).toContain(childAId);

			await user.keyboard("{Meta>}z{/Meta}");

			const undoneChildren = useGraphStore
				.getState()
				.dependencies.filter((d) => d.from === goalId)
				.map((d) => d.to);
			expect(undoneChildren).toContain(childAId);
			expect(undoneChildren).toContain(childBId);
		});

		it("expands collapsed target node when moving a task into it", async () => {
			const user = userEvent.setup();
			render(<App />);

			await user.dblClick(getCanvas());
			await waitFor(() => {
				expect(screen.getByLabelText("Task label")).toBeInTheDocument();
			});
			await user.keyboard("Goal{Enter}");
			await waitFor(() => expect(screen.getByText("Goal")).toBeInTheDocument());

			selectNode(getGoalId());
			await user.keyboard("{Tab}");
			await waitFor(() => {
				expect(screen.getByLabelText("Task label")).toBeInTheDocument();
			});
			await user.keyboard("A{Enter}");
			await waitFor(() => expect(screen.getByText("A")).toBeInTheDocument());

			selectNode(getGoalId());
			await user.keyboard("{Tab}");
			await waitFor(() => {
				expect(screen.getByLabelText("Task label")).toBeInTheDocument();
			});
			await user.keyboard("B{Enter}");
			await waitFor(() => expect(screen.getByText("B")).toBeInTheDocument());

			// Add a child to B so it can be collapsed
			const childBId = useGraphStore.getState().tasks[2].id;
			selectNode(childBId);
			await user.keyboard("{Tab}");
			await waitFor(() => {
				expect(screen.getByLabelText("Task label")).toBeInTheDocument();
			});
			await user.keyboard("B-child{Enter}");
			await waitFor(() =>
				expect(screen.getByText("B-child")).toBeInTheDocument(),
			);

			// Collapse B
			useGraphStore.getState().collapseNode(childBId);
			await waitFor(() => {
				expect(screen.queryByText("B-child")).not.toBeInTheDocument();
			});

			// Move A into collapsed B
			const childAId = useGraphStore.getState().tasks[1].id;
			selectNode(childAId);
			await user.keyboard("m");
			selectNode(childBId);
			await user.keyboard("{Enter}");

			// B should be expanded so the moved node A is visible
			expect(useGraphStore.getState().collapsedNodes.has(childBId)).toBe(false);
			expect(screen.getByText("A")).toBeInTheDocument();
			expect(screen.getByText("B-child")).toBeInTheDocument();

			// Selection should be on the moved node
			expect(useGraphStore.getState().selectedNodeId).toBe(childAId);
		});

		it("right-click menu offers Move option", async () => {
			const user = userEvent.setup();
			render(<App />);

			await user.dblClick(getCanvas());
			await waitFor(() => {
				expect(screen.getByLabelText("Task label")).toBeInTheDocument();
			});
			await user.keyboard("Goal{Enter}");
			await waitFor(() => expect(screen.getByText("Goal")).toBeInTheDocument());

			selectNode(getGoalId());
			await user.keyboard("{Tab}");
			await waitFor(() => {
				expect(screen.getByLabelText("Task label")).toBeInTheDocument();
			});
			await user.keyboard("A{Enter}");
			await waitFor(() => expect(screen.getByText("A")).toBeInTheDocument());

			const node = getNodeByText("A");
			await user.pointer({ keys: "[MouseRight]", target: node });

			await waitFor(() => {
				expect(
					screen.getByRole("menuitem", { name: "Move" }),
				).toBeInTheDocument();
			});
		});
	});
});
