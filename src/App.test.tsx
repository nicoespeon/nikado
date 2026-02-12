import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { useGraphStore } from "./store/graph-store";

function getCanvas() {
	const canvas = document.querySelector(".react-flow");
	if (!canvas) throw new Error("Canvas not found");
	return canvas;
}

describe("App", () => {
	afterEach(() => {
		cleanup();
		useGraphStore.setState({ goalId: null, tasks: [], dependencies: [] });
	});

	it("shows instruction when canvas is empty", () => {
		render(<App />);

		expect(
			screen.getByText(/double-click or press enter to create your goal/i),
		).toBeInTheDocument();
	});

	it("hides instruction after creating a goal", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.dblClick(getCanvas());

		await waitFor(() => {
			expect(
				screen.queryByText(/double-click or press enter to create your goal/i),
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

	it("creates a goal with Enter key", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.keyboard("{Enter}");

		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
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
