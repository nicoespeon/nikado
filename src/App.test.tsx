import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import type { TaskId, TaskLabel } from "./model/graph";
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
	const button = node.querySelector('button[aria-label="Done"]');
	if (!button) throw new Error("Done button not found");
	return button;
}

describe("App", () => {
	afterEach(() => {
		cleanup();
		resetStore();
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
});
