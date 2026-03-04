import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useGraphStore } from "../store/graph-store";
import { resetLicenseStore, useLicenseStore } from "../store/license-store";
import {
	resetSavedGraphsStore,
	useSavedGraphsStore,
} from "../store/saved-graphs-store";
import { SavedGraphsPanel } from "./SavedGraphsPanel";

function resetGraphStore() {
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

function createGoal(label: string) {
	useGraphStore.getState().createGoal(label);
}

function PanelHarness() {
	const [expanded, setExpanded] = useState(false);
	return (
		<SavedGraphsPanel
			expanded={expanded}
			onToggle={() => {
				setExpanded((prev) => !prev);
			}}
		/>
	);
}

describe("SavedGraphsPanel", () => {
	beforeEach(() => {
		useLicenseStore.setState({
			license: {
				status: "active",
				licenseKey: "test-key",
				validatedAt: Date.now(),
			},
		});
	});

	afterEach(() => {
		cleanup();
		resetGraphStore();
		resetSavedGraphsStore();
		resetLicenseStore();
		localStorage.clear();
	});

	it("shows a collapsed button by default", () => {
		render(<PanelHarness />);

		expect(
			screen.getByRole("button", { name: "Saved graphs (L)" }),
		).toBeInTheDocument();
	});

	it("expands to show empty state when no graphs are saved", async () => {
		const user = userEvent.setup();
		render(<PanelHarness />);

		await user.click(screen.getByRole("button", { name: "Saved graphs (L)" }));

		expect(screen.getByText("Saved Graphs")).toBeInTheDocument();
		expect(
			screen.getByText("No saved graphs yet. Create a goal to get started."),
		).toBeInTheDocument();
	});

	it("auto-saves a graph when a goal is created", async () => {
		const user = userEvent.setup();
		render(<PanelHarness />);

		createGoal("Migrate to React 19");

		await waitFor(
			() => {
				expect(useSavedGraphsStore.getState().graphs).toHaveLength(1);
			},
			{ timeout: 2000 },
		);

		await user.click(screen.getByRole("button", { name: "Saved graphs (L)" }));

		expect(screen.getByText("Migrate to React 19")).toBeInTheDocument();
	});

	it("loads a saved graph when clicked", async () => {
		const user = userEvent.setup();
		render(<PanelHarness />);

		createGoal("Graph A");
		await waitFor(
			() => {
				expect(useSavedGraphsStore.getState().graphs).toHaveLength(1);
			},
			{ timeout: 2000 },
		);

		useSavedGraphsStore.getState().newGraph();
		createGoal("Graph B");
		await waitFor(
			() => {
				expect(useSavedGraphsStore.getState().graphs).toHaveLength(2);
			},
			{ timeout: 2000 },
		);

		await user.click(screen.getByRole("button", { name: "Saved graphs (L)" }));
		await user.click(screen.getByText("Graph A"));

		const goal = useGraphStore
			.getState()
			.tasks.find((t) => t.id === useGraphStore.getState().goalId);
		expect(goal?.label).toBe("Graph A");
	});

	it("deletes a saved graph", async () => {
		const user = userEvent.setup();
		render(<PanelHarness />);

		createGoal("Doomed graph");
		await waitFor(
			() => {
				expect(useSavedGraphsStore.getState().graphs).toHaveLength(1);
			},
			{ timeout: 2000 },
		);

		await user.click(screen.getByRole("button", { name: "Saved graphs (L)" }));
		await user.click(
			screen.getByRole("button", { name: "Delete Doomed graph" }),
		);

		expect(useSavedGraphsStore.getState().graphs).toHaveLength(0);
		expect(
			screen.getByText("No saved graphs yet. Create a goal to get started."),
		).toBeInTheDocument();
	});

	it("creates a new graph and auto-saves the current one", async () => {
		const user = userEvent.setup();
		render(<PanelHarness />);

		createGoal("First graph");
		await waitFor(
			() => {
				expect(useSavedGraphsStore.getState().graphs).toHaveLength(1);
			},
			{ timeout: 2000 },
		);

		await user.click(screen.getByRole("button", { name: "Saved graphs (L)" }));
		await user.click(screen.getByText("+ New graph (N)"));

		expect(useGraphStore.getState().goalId).toBeNull();
		expect(useSavedGraphsStore.getState().activeGraphId).toBeNull();
		expect(useSavedGraphsStore.getState().graphs).toHaveLength(1);
	});

	it("updates graph name when goal is renamed and auto-saved", async () => {
		render(<PanelHarness />);

		createGoal("Old name");
		await waitFor(
			() => {
				expect(useSavedGraphsStore.getState().graphs).toHaveLength(1);
			},
			{ timeout: 2000 },
		);

		const goalId = useGraphStore.getState().goalId;
		if (!goalId) throw new Error("Expected goalId to be set");
		useGraphStore.getState().setTaskLabel(goalId, "New name");

		await waitFor(
			() => {
				const saved = useSavedGraphsStore.getState().graphs[0];
				const goal = saved.graph.tasks.find((t) => t.id === saved.graph.goalId);
				expect(goal?.label).toBe("New name");
			},
			{ timeout: 2000 },
		);
	});

	it("shows graph count on collapsed button", async () => {
		render(<PanelHarness />);

		createGoal("Graph 1");
		await waitFor(
			() => {
				expect(useSavedGraphsStore.getState().graphs).toHaveLength(1);
			},
			{ timeout: 2000 },
		);

		expect(
			screen.getByRole("button", { name: "Saved graphs (L)" }),
		).toHaveTextContent("1");
	});

	it("styles the collapsed button in green", () => {
		render(<PanelHarness />);

		const button = screen.getByRole("button", { name: "Saved graphs (L)" });
		expect(button.className).toContain("bg-green-50");
	});

	it("loads a graph via Enter key after navigating with arrows", async () => {
		const user = userEvent.setup();
		render(<PanelHarness />);

		createGoal("Graph A");
		await waitFor(
			() => {
				expect(useSavedGraphsStore.getState().graphs).toHaveLength(1);
			},
			{ timeout: 2000 },
		);

		useSavedGraphsStore.getState().newGraph();
		createGoal("Graph B");
		await waitFor(
			() => {
				expect(useSavedGraphsStore.getState().graphs).toHaveLength(2);
			},
			{ timeout: 2000 },
		);

		await user.click(screen.getByRole("button", { name: "Saved graphs (L)" }));

		// Focus is on the panel, ArrowDown moves to second item (index 1)
		await user.keyboard("{ArrowDown}");
		await user.keyboard("{Enter}");

		const goal = useGraphStore
			.getState()
			.tasks.find((t) => t.id === useGraphStore.getState().goalId);
		expect(goal?.label).toBe("Graph B");
	});

	it("deletes a graph via Backspace key", async () => {
		const user = userEvent.setup();
		render(<PanelHarness />);

		createGoal("To delete");
		await waitFor(
			() => {
				expect(useSavedGraphsStore.getState().graphs).toHaveLength(1);
			},
			{ timeout: 2000 },
		);

		await user.click(screen.getByRole("button", { name: "Saved graphs (L)" }));
		await user.keyboard("{Backspace}");

		expect(useSavedGraphsStore.getState().graphs).toHaveLength(0);
	});
});
