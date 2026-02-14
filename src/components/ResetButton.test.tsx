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
});
