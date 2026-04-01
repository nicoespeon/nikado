import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetMarkdownCopy } from "../hooks/use-copy-markdown";
import { resetShare } from "../hooks/use-share";
import { resetTheme } from "../hooks/use-theme";
import type { TaskId, TaskLabel } from "../model/graph";
import { useGraphStore } from "../store/graph-store";
import { MobileToolbar } from "./MobileToolbar";

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

function setupGraph(goal: string) {
	useGraphStore.getState().createGoal(goal);
}

function getGoalId() {
	const goalId = useGraphStore.getState().goalId;
	if (!goalId) throw new Error("Goal not found");
	return goalId;
}

describe("MobileToolbar", () => {
	beforeEach(() => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
	});

	afterEach(() => {
		vi.useRealTimers();
		cleanup();
		resetStore();
		resetShare();
		resetMarkdownCopy();
		localStorage.removeItem("nikado-theme");
		resetTheme();
	});

	it("renders undo button disabled when no history", () => {
		render(<MobileToolbar />);

		expect(screen.getByRole("button", { name: /undo/i })).toBeDisabled();
	});

	it("renders redo button disabled when no future", () => {
		render(<MobileToolbar />);

		expect(screen.getByRole("button", { name: /redo/i })).toBeDisabled();
	});

	it("enables undo after a state change", () => {
		setupGraph("My goal");
		const goalId = getGoalId();
		useGraphStore.getState().addSubTask(goalId, "Task A");

		render(<MobileToolbar />);

		expect(screen.getByRole("button", { name: /undo/i })).toBeEnabled();
	});

	it("undo button triggers store undo", async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		setupGraph("My goal");
		const goalId = getGoalId();
		useGraphStore.getState().addSubTask(goalId, "Task A");

		render(<MobileToolbar />);
		await user.click(screen.getByRole("button", { name: /undo/i }));

		expect(useGraphStore.getState().tasks).toHaveLength(1);
	});

	it("redo button triggers store redo", async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		setupGraph("My goal");
		const goalId = getGoalId();
		useGraphStore.getState().addSubTask(goalId, "Task A");
		useGraphStore.getState().undo();

		render(<MobileToolbar />);
		await user.click(screen.getByRole("button", { name: /redo/i }));

		expect(useGraphStore.getState().tasks).toHaveLength(2);
	});

	it("share button copies URL to clipboard", async () => {
		const writeText = vi
			.spyOn(navigator.clipboard, "writeText")
			.mockResolvedValue(undefined);
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		setupGraph("My goal");

		render(<MobileToolbar />);
		await user.click(screen.getByRole("button", { name: /share/i }));

		expect(writeText).toHaveBeenCalledWith(window.location.href);
		writeText.mockRestore();
	});

	it("copy markdown button copies graph as text", async () => {
		const writeText = vi
			.spyOn(navigator.clipboard, "writeText")
			.mockResolvedValue(undefined);
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		setupGraph("My goal");

		render(<MobileToolbar />);
		await user.click(screen.getByRole("button", { name: /copy as text/i }));

		expect(writeText).toHaveBeenCalledWith("- [ ] My goal");
		writeText.mockRestore();
	});

	it("reset button clears the graph", async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		setupGraph("My goal");

		render(<MobileToolbar />);
		await user.click(screen.getByRole("button", { name: /reset/i }));

		expect(useGraphStore.getState().goalId).toBeNull();
	});

	it("theme toggle cycles themes", async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

		render(<MobileToolbar />);

		const button = screen.getByRole("button", { name: /theme/i });

		await user.click(button);
		expect(
			screen.getByRole("button", { name: "Theme: light" }),
		).toBeInTheDocument();

		await user.click(button);
		expect(
			screen.getByRole("button", { name: "Theme: dark" }),
		).toBeInTheDocument();
	});

	it("help button opens the help menu", async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

		render(<MobileToolbar />);
		await user.click(screen.getByRole("button", { name: "Help" }));

		expect(
			screen.getByRole("dialog", { name: "How to use Nikado" }),
		).toBeInTheDocument();
	});

	it("help menu closes when close button is clicked", async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

		render(<MobileToolbar />);
		await user.click(screen.getByRole("button", { name: "Help" }));

		await user.click(screen.getByRole("button", { name: "Close" }));

		await waitFor(() => {
			expect(
				screen.queryByRole("dialog", { name: "How to use Nikado" }),
			).not.toBeInTheDocument();
		});
	});

	it("does not render an export button", () => {
		setupGraph("My goal");

		render(<MobileToolbar />);

		expect(
			screen.queryByRole("button", { name: /export/i }),
		).not.toBeInTheDocument();
	});

	describe("reset confirmation for large graphs", () => {
		function setupLargeGraph({ goalDone = false } = {}) {
			const goalId = "goal-id" as TaskId;
			const tasks = [
				{
					id: goalId,
					label: "Goal" as TaskLabel,
					status: (goalDone ? "done" : "pending") as "done" | "pending",
				},
			];
			const dependencies = [];

			for (let i = 1; i <= 15; i++) {
				const taskId = `task-${i}` as TaskId;
				tasks.push({
					id: taskId,
					label: `Task ${i}` as TaskLabel,
					status: "pending",
				});
				dependencies.push({ from: goalId, to: taskId });
			}

			useGraphStore.setState({ goalId, tasks, dependencies });
		}

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("asks for confirmation when resetting a large graph", async () => {
			const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
			const user = userEvent.setup({
				advanceTimers: vi.advanceTimersByTime,
			});
			setupLargeGraph();
			render(<MobileToolbar />);

			await user.click(screen.getByRole("button", { name: /reset/i }));

			expect(confirmSpy).toHaveBeenCalled();
			expect(useGraphStore.getState().goalId).not.toBeNull();
		});

		it("resets when confirmation is accepted", async () => {
			vi.spyOn(window, "confirm").mockReturnValue(true);
			const user = userEvent.setup({
				advanceTimers: vi.advanceTimersByTime,
			});
			setupLargeGraph();
			render(<MobileToolbar />);

			await user.click(screen.getByRole("button", { name: /reset/i }));

			expect(useGraphStore.getState().goalId).toBeNull();
		});

		it("does not ask for confirmation when goal is completed", async () => {
			const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
			const user = userEvent.setup({
				advanceTimers: vi.advanceTimersByTime,
			});
			setupLargeGraph({ goalDone: true });
			render(<MobileToolbar />);

			await user.click(screen.getByRole("button", { name: /reset/i }));

			expect(confirmSpy).not.toHaveBeenCalled();
			expect(useGraphStore.getState().goalId).toBeNull();
		});
	});
});
