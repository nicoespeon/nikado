import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { MAX_LABEL_LENGTH, type TaskLabel } from "../model/graph";
import { useGraphStore } from "../store/graph-store";
import { OutlineView } from "./OutlineView";

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
		collapsedNodes: new Set(),
	});
}

type ChildConfig = {
	label: string;
	status?: "pending" | "done" | "parked";
	children?: { label: string; status?: "pending" | "done" | "parked" }[];
};

function findTaskByLabel(label: string) {
	const task = useGraphStore
		.getState()
		.tasks.find((t) => t.label === (label as TaskLabel));
	if (!task) throw new Error(`Task "${label}" not found`);
	return task;
}

function setupGraph(config: { goal: string; children?: ChildConfig[] }) {
	const state = useGraphStore.getState();
	state.createGoal(config.goal);
	const goalId = useGraphStore.getState().goalId;
	if (!goalId) throw new Error("Goal was not created");

	if (config.children) {
		for (const child of config.children) {
			const childId = useGraphStore.getState().addSubTask(goalId, child.label);
			if (child.status === "done") {
				useGraphStore.getState().toggleDone(childId);
			} else if (child.status === "parked") {
				useGraphStore.getState().setTaskStatus(childId, "parked");
			}

			if (child.children) {
				for (const grandchild of child.children) {
					const gcId = useGraphStore
						.getState()
						.addSubTask(childId, grandchild.label);
					if (grandchild.status === "done") {
						useGraphStore.getState().toggleDone(gcId);
					}
				}
			}
		}
	}
}

describe("OutlineView", () => {
	afterEach(() => {
		cleanup();
		resetStore();
	});

	it("renders goal as a prominent row", () => {
		setupGraph({ goal: "Refactor auth" });

		render(<OutlineView />);

		const goalText = screen.getByText("Refactor auth");
		expect(goalText).toBeInTheDocument();
		expect(goalText.className).toContain("font-semibold");
		expect(goalText.className).toContain("text-lg");
	});

	it("renders sub-tasks indented under parent", () => {
		setupGraph({
			goal: "Main goal",
			children: [{ label: "Sub-task A" }, { label: "Sub-task B" }],
		});

		render(<OutlineView />);

		const tree = screen.getByRole("tree");
		const items = tree.querySelectorAll('[role="treeitem"]');
		expect(items).toHaveLength(3);

		const goalItem = items[0];
		const childItem = items[1];
		expect(goalItem).toHaveAttribute("aria-level", "1");
		expect(childItem).toHaveAttribute("aria-level", "2");

		// Children should have more padding than the goal
		const goalPadding = (goalItem as HTMLElement).style.paddingLeft;
		const childPadding = (childItem as HTMLElement).style.paddingLeft;
		expect(parseFloat(goalPadding)).toBeLessThan(parseFloat(childPadding));
	});

	it("highlights leaf tasks with amber styling", () => {
		setupGraph({
			goal: "Main goal",
			children: [{ label: "Leaf task" }],
		});

		render(<OutlineView />);

		const items = screen
			.getByRole("tree")
			.querySelectorAll('[role="treeitem"]');
		const leafRow = items[1] as HTMLElement;
		expect(leafRow.className).toContain("amber");
	});

	it("shows done tasks with strikethrough", () => {
		setupGraph({
			goal: "Main goal",
			children: [{ label: "Done task", status: "done" }],
		});

		render(<OutlineView />);

		const doneText = screen.getByText("Done task");
		expect(doneText.className).toContain("line-through");
	});

	it("tapping a row selects it", async () => {
		const user = userEvent.setup();
		setupGraph({
			goal: "Main goal",
			children: [{ label: "Child task" }],
		});

		render(<OutlineView />);

		await user.click(screen.getByText("Child task"));

		const state = useGraphStore.getState();
		const childTask = state.tasks.find(
			(t) => t.label === ("Child task" as TaskLabel),
		);
		expect(state.selectedNodeId).toBe(childTask?.id);
	});

	it("tapping checkbox toggles done", async () => {
		const user = userEvent.setup();
		setupGraph({
			goal: "Main goal",
			children: [{ label: "Toggle me" }],
		});

		render(<OutlineView />);

		const markDoneButtons = screen.getAllByRole("button", {
			name: "Mark done",
		});
		// First "Mark done" is the goal's, second is the child's
		await user.click(markDoneButtons[1]);

		const state = useGraphStore.getState();
		const task = state.tasks.find(
			(t) => t.label === ("Toggle me" as TaskLabel),
		);
		expect(task?.status).toBe("done");
	});

	it("collapse chevron hides children", async () => {
		const user = userEvent.setup();
		setupGraph({
			goal: "Main goal",
			children: [
				{
					label: "Parent",
					children: [{ label: "Grandchild" }],
				},
			],
		});

		render(<OutlineView />);

		expect(screen.getByText("Grandchild")).toBeInTheDocument();

		const parentRow = screen.getByText("Parent").closest('[role="treeitem"]');
		if (!parentRow) throw new Error("Parent row not found");
		const collapseButton = parentRow.querySelector(
			'button[aria-label="Collapse subtasks"]',
		);
		if (!collapseButton) throw new Error("Collapse button not found");
		await user.click(collapseButton);

		expect(screen.queryByText("Grandchild")).not.toBeInTheDocument();
	});

	describe("long-press context menu", () => {
		it("shows Move up and Move down on right-click", async () => {
			const user = userEvent.setup();
			setupGraph({
				goal: "Goal",
				children: [{ label: "A" }, { label: "B" }, { label: "C" }],
			});

			render(<OutlineView />);

			const row = screen.getByText("B");
			await user.pointer({ keys: "[MouseRight]", target: row });

			expect(
				screen.getByRole("menuitem", { name: "Move up" }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("menuitem", { name: "Move down" }),
			).toBeInTheDocument();
		});

		it("Move up reorders the task", async () => {
			const user = userEvent.setup();
			setupGraph({
				goal: "Goal",
				children: [{ label: "A" }, { label: "B" }],
			});

			render(<OutlineView />);

			const row = screen.getByText("B");
			await user.pointer({ keys: "[MouseRight]", target: row });

			await user.click(screen.getByRole("menuitem", { name: "Move up" }));

			const state = useGraphStore.getState();
			const goalChildren = state.dependencies
				.filter((d) => d.from === state.goalId)
				.map((d) => state.tasks.find((t) => t.id === d.to)?.label);
			expect(goalChildren).toEqual(["B", "A"]);
		});

		it("hides Move up for first sibling", async () => {
			const user = userEvent.setup();
			setupGraph({
				goal: "Goal",
				children: [{ label: "A" }, { label: "B" }],
			});

			render(<OutlineView />);

			const row = screen.getByText("A");
			await user.pointer({ keys: "[MouseRight]", target: row });

			expect(
				screen.queryByRole("menuitem", { name: "Move up" }),
			).not.toBeInTheDocument();
			expect(
				screen.getByRole("menuitem", { name: "Move down" }),
			).toBeInTheDocument();
		});

		it("hides Move down for last sibling", async () => {
			const user = userEvent.setup();
			setupGraph({
				goal: "Goal",
				children: [{ label: "A" }, { label: "B" }],
			});

			render(<OutlineView />);

			const row = screen.getByText("B");
			await user.pointer({ keys: "[MouseRight]", target: row });

			expect(
				screen.getByRole("menuitem", { name: "Move up" }),
			).toBeInTheDocument();
			expect(
				screen.queryByRole("menuitem", { name: "Move down" }),
			).not.toBeInTheDocument();
		});

		it("does not show context menu for the goal", async () => {
			const user = userEvent.setup();
			setupGraph({ goal: "Goal" });

			render(<OutlineView />);

			const row = screen.getByText("Goal");
			await user.pointer({ keys: "[MouseRight]", target: row });

			expect(screen.queryByRole("menu")).not.toBeInTheDocument();
		});
	});

	describe("inline editing", () => {
		it("shows textarea with current label when editing", () => {
			setupGraph({
				goal: "Main goal",
				children: [{ label: "Edit me" }],
			});
			const task = findTaskByLabel("Edit me");
			useGraphStore.setState({ editingNodeId: task.id });

			render(<OutlineView />);

			const textarea = screen.getByRole("textbox", { name: "Task label" });
			expect(textarea).toBeInTheDocument();
			expect(textarea).toHaveValue("Edit me");
		});

		it("Enter confirms the edit", async () => {
			const user = userEvent.setup();
			setupGraph({
				goal: "Main goal",
				children: [{ label: "Old label" }],
			});
			const task = findTaskByLabel("Old label");
			useGraphStore.setState({
				editingNodeId: task.id,
				selectedNodeId: task.id,
			});

			render(<OutlineView />);

			const textarea = screen.getByRole("textbox", { name: "Task label" });
			await user.clear(textarea);
			await user.type(textarea, "New label{Enter}");

			const state = useGraphStore.getState();
			expect(state.editingNodeId).toBeNull();
			expect(state.tasks.find((t) => t.id === task.id)?.label).toBe(
				"New label" as TaskLabel,
			);
		});

		it("Escape cancels the edit", async () => {
			const user = userEvent.setup();
			setupGraph({
				goal: "Main goal",
				children: [{ label: "Keep me" }],
			});
			const task = findTaskByLabel("Keep me");
			useGraphStore.setState({
				editingNodeId: task.id,
				selectedNodeId: task.id,
			});

			render(<OutlineView />);

			const textarea = screen.getByRole("textbox", { name: "Task label" });
			await user.clear(textarea);
			await user.type(textarea, "Changed{Escape}");

			const state = useGraphStore.getState();
			expect(state.editingNodeId).toBeNull();
			expect(state.tasks.find((t) => t.id === task.id)?.label).toBe(
				"Keep me" as TaskLabel,
			);
		});

		it("shows character counter with current/max length", () => {
			setupGraph({
				goal: "Main goal",
				children: [{ label: "Count me" }],
			});
			const task = findTaskByLabel("Count me");
			useGraphStore.setState({ editingNodeId: task.id });

			render(<OutlineView />);

			expect(
				screen.getByText(`8/${String(MAX_LABEL_LENGTH)}`),
			).toBeInTheDocument();
		});
	});
});
