import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TaskLabel } from "../model/graph";
import { useGraphStore } from "../store/graph-store";
import { MobileActionBar } from "./MobileActionBar";
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

function setupGraph(config: {
	goal: string;
	children?: {
		label: string;
		children?: { label: string }[];
	}[];
}) {
	const state = useGraphStore.getState();
	state.createGoal(config.goal);
	const goalId = useGraphStore.getState().goalId;
	if (!goalId) throw new Error("Goal was not created");

	if (config.children) {
		for (const child of config.children) {
			const childId = useGraphStore.getState().addSubTask(goalId, child.label);
			if (child.children) {
				for (const grandchild of child.children) {
					useGraphStore.getState().addSubTask(childId, grandchild.label);
				}
			}
		}
	}
}

function getGoalId() {
	const goalId = useGraphStore.getState().goalId;
	if (!goalId) throw new Error("Goal not found");
	return goalId;
}

function findTaskByLabel(label: string) {
	const task = useGraphStore
		.getState()
		.tasks.find((t) => t.label === (label as TaskLabel));
	if (!task) throw new Error(`Task "${label}" not found`);
	return task;
}

describe("MobileActionBar", () => {
	beforeEach(() => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
	});

	afterEach(() => {
		vi.useRealTimers();
		cleanup();
		resetStore();
	});

	it("renders nothing when no task is selected", () => {
		setupGraph({ goal: "My goal" });

		const { container } = render(<MobileActionBar />);

		expect(container.innerHTML).toBe("");
	});

	it("shows action buttons when a task is selected", () => {
		setupGraph({
			goal: "My goal",
			children: [{ label: "Task A" }],
		});
		const taskA = findTaskByLabel("Task A");
		useGraphStore.setState({ selectedNodeId: taskA.id });

		render(<MobileActionBar />);

		expect(screen.getByText("Sub-task")).toBeInTheDocument();
		expect(screen.getByText("Sibling")).toBeInTheDocument();
		expect(screen.getByText("Edit")).toBeInTheDocument();
		expect(screen.getByText("Delete")).toBeInTheDocument();
	});

	it("is hidden while editing", () => {
		setupGraph({ goal: "My goal" });
		const goalId = useGraphStore.getState().goalId;
		useGraphStore.setState({
			selectedNodeId: goalId,
			editingNodeId: goalId,
		});

		const { container } = render(<MobileActionBar />);

		expect(container.innerHTML).toBe("");
	});

	it("add sub-task creates a child and enters editing mode", async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		setupGraph({ goal: "My goal" });
		const goalId = getGoalId();
		useGraphStore.setState({ selectedNodeId: goalId });

		render(<MobileActionBar />);
		await user.click(screen.getByText("Sub-task"));

		const state = useGraphStore.getState();
		expect(state.tasks).toHaveLength(2);
		expect(state.editingNodeId).not.toBeNull();
		const newTask = state.tasks.find((t) => t.id !== goalId);
		expect(state.editingNodeId).toBe(newTask?.id);
	});

	it("add sibling creates a sibling and enters editing mode", async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		setupGraph({
			goal: "My goal",
			children: [{ label: "Task A" }],
		});
		const taskA = findTaskByLabel("Task A");
		useGraphStore.setState({ selectedNodeId: taskA.id });

		render(<MobileActionBar />);
		await user.click(screen.getByText("Sibling"));

		const state = useGraphStore.getState();
		expect(state.tasks).toHaveLength(3);
		expect(state.editingNodeId).not.toBeNull();
	});

	it("hides sibling button when goal is selected", () => {
		setupGraph({ goal: "My goal" });
		const goalId = getGoalId();
		useGraphStore.setState({ selectedNodeId: goalId });

		render(<MobileActionBar />);

		expect(screen.queryByText("Sibling")).not.toBeInTheDocument();
		expect(screen.getByText("Sub-task")).toBeInTheDocument();
	});

	it("edit enters editing mode on selected task", async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		setupGraph({
			goal: "My goal",
			children: [{ label: "Task A" }],
		});
		const taskA = findTaskByLabel("Task A");
		useGraphStore.setState({ selectedNodeId: taskA.id });

		render(<MobileActionBar />);
		await user.click(screen.getByText("Edit"));

		expect(useGraphStore.getState().editingNodeId).toBe(taskA.id);
	});

	it("delete removes a leaf task immediately", async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		setupGraph({
			goal: "My goal",
			children: [{ label: "Leaf task" }],
		});
		const leaf = findTaskByLabel("Leaf task");
		useGraphStore.setState({ selectedNodeId: leaf.id });

		render(<MobileActionBar />);
		await user.click(screen.getByText("Delete"));

		const state = useGraphStore.getState();
		expect(state.tasks.find((t) => t.id === leaf.id)).toBeUndefined();
	});

	it("delete shows confirmation for non-leaf task, requires second tap", async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		setupGraph({
			goal: "My goal",
			children: [{ label: "Parent", children: [{ label: "Child" }] }],
		});
		const parent = findTaskByLabel("Parent");
		useGraphStore.setState({ selectedNodeId: parent.id });

		render(<MobileActionBar />);

		// First tap shows confirmation
		await user.click(screen.getByText("Delete"));
		expect(screen.getByText("Confirm?")).toBeInTheDocument();
		expect(
			useGraphStore.getState().tasks.find((t) => t.id === parent.id),
		).toBeDefined();

		// Second tap deletes
		await user.click(screen.getByText("Confirm?"));
		expect(
			useGraphStore.getState().tasks.find((t) => t.id === parent.id),
		).toBeUndefined();
	});

	it("delete confirmation resets after timeout", async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		setupGraph({
			goal: "My goal",
			children: [{ label: "Parent", children: [{ label: "Child" }] }],
		});
		const parent = findTaskByLabel("Parent");
		useGraphStore.setState({ selectedNodeId: parent.id });

		render(<MobileActionBar />);

		await user.click(screen.getByText("Delete"));
		expect(screen.getByText("Confirm?")).toBeInTheDocument();

		act(() => {
			vi.advanceTimersByTime(3000);
		});

		expect(screen.queryByText("Confirm?")).not.toBeInTheDocument();
		expect(screen.getByText("Delete")).toBeInTheDocument();
	});

	it("add sub-task enters editing mode visible in outline", async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		setupGraph({ goal: "My goal" });
		const goalId = getGoalId();
		useGraphStore.setState({ selectedNodeId: goalId });

		render(
			<>
				<OutlineView />
				<MobileActionBar />
			</>,
		);
		await user.click(screen.getByText("Sub-task"));

		expect(
			screen.getByRole("textbox", { name: "Task label" }),
		).toBeInTheDocument();
	});
});
