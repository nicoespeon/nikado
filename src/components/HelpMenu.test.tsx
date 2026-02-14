import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../App";
import { useGraphStore } from "../store/graph-store";

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

describe("Help menu", () => {
	afterEach(() => {
		cleanup();
		resetStore();
		window.history.replaceState(null, "", window.location.pathname);
	});

	it("opens when the Help button is clicked", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.click(screen.getByRole("button", { name: "Help (?)" }));

		expect(getHelpDialog()).toBeInTheDocument();
	});

	it("shows keyboard shortcuts organized by category", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.click(screen.getByRole("button", { name: "Help (?)" }));

		const dialog = getHelpDialog();
		expect(within(dialog).getByText("Keyboard shortcuts")).toBeInTheDocument();
		expect(within(dialog).getByText("Tasks")).toBeInTheDocument();
		expect(within(dialog).getByText("Navigation")).toBeInTheDocument();
		expect(within(dialog).getByText("View")).toBeInTheDocument();
		expect(within(dialog).getByText("Actions")).toBeInTheDocument();
		expect(
			within(dialog).getByText("Create goal / focus goal"),
		).toBeInTheDocument();
		expect(within(dialog).getByText("Toggle done")).toBeInTheDocument();
		expect(within(dialog).getByText("Undo")).toBeInTheDocument();
		expect(within(dialog).getByText("Export as image")).toBeInTheDocument();
	});

	it("shows getting started section", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.click(screen.getByRole("button", { name: "Help (?)" }));

		const dialog = getHelpDialog();
		expect(within(dialog).getByText(/set your goal/i)).toBeInTheDocument();
		expect(
			within(dialog).getByText(/work from the leaves/i),
		).toBeInTheDocument();
		expect(
			within(dialog).getByRole("link", { name: /read my intro/i }),
		).toHaveAttribute(
			"href",
			"https://understandlegacycode.com/blog/a-process-to-do-safe-changes-in-a-complex-codebase",
		);
		expect(within(dialog).getByRole("link", { name: /book/i })).toHaveAttribute(
			"href",
			"https://mikadomethod.info/",
		);
	});

	it("closes on Escape", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.click(screen.getByRole("button", { name: "Help (?)" }));
		expect(getHelpDialog()).toBeInTheDocument();

		await user.keyboard("{Escape}");

		expect(
			screen.queryByRole("dialog", { name: "How to use Nikado" }),
		).not.toBeInTheDocument();
	});

	it("closes when clicking the close button", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.click(screen.getByRole("button", { name: "Help (?)" }));
		expect(getHelpDialog()).toBeInTheDocument();

		await user.click(
			within(getHelpDialog()).getByRole("button", {
				name: "Close",
			}),
		);

		expect(
			screen.queryByRole("dialog", { name: "How to use Nikado" }),
		).not.toBeInTheDocument();
	});

	it("closes when pressing Enter (close button is auto-focused)", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.click(screen.getByRole("button", { name: "Help (?)" }));
		expect(getHelpDialog()).toBeInTheDocument();

		await user.keyboard("{Enter}");

		expect(
			screen.queryByRole("dialog", { name: "How to use Nikado" }),
		).not.toBeInTheDocument();
	});

	it("closes when clicking the backdrop", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.click(screen.getByRole("button", { name: "Help (?)" }));
		expect(getHelpDialog()).toBeInTheDocument();

		const backdrop = screen.getByRole("dialog", {
			name: "How to use Nikado",
		}).parentElement;
		if (!backdrop) throw new Error("Backdrop not found");
		await user.click(backdrop);

		expect(
			screen.queryByRole("dialog", { name: "How to use Nikado" }),
		).not.toBeInTheDocument();
	});

	it("opens and closes with ? key", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.keyboard("?");

		expect(getHelpDialog()).toBeInTheDocument();

		await user.keyboard("?");

		expect(
			screen.queryByRole("dialog", { name: "How to use Nikado" }),
		).not.toBeInTheDocument();
	});

	it("does not open with ? key when an input is focused", async () => {
		const user = userEvent.setup();
		render(<App />);

		const canvas = document.querySelector(".react-flow");
		if (!canvas) throw new Error("Canvas not found");
		await user.dblClick(canvas);

		await user.keyboard("?");

		expect(
			screen.queryByRole("dialog", { name: "How to use Nikado" }),
		).not.toBeInTheDocument();
	});
});

function getHelpDialog() {
	return screen.getByRole("dialog", { name: "How to use Nikado" });
}
