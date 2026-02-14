import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import { useGraphStore } from "../store/graph-store";

vi.mock("html-to-image", () => ({
	toPng: vi.fn().mockResolvedValue("data:image/png;base64,fake"),
}));

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

describe("Export button", () => {
	afterEach(() => {
		cleanup();
		resetStore();
		window.history.replaceState(null, "", window.location.pathname);
	});

	it("is disabled when the graph is empty", () => {
		render(<App />);

		expect(
			screen.getByRole("button", { name: "Export as image (X)" }),
		).toBeDisabled();
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
			screen.getByRole("button", { name: "Export as image (X)" }),
		).not.toBeDisabled();
	});

	it("calls toPng when clicked", async () => {
		const { toPng } = await import("html-to-image");
		const clickSpy = vi
			.spyOn(HTMLAnchorElement.prototype, "click")
			.mockImplementation(() => undefined);
		const user = userEvent.setup();
		render(<App />);

		await user.dblClick(getCanvas());
		await waitFor(() => {
			expect(screen.getByLabelText("Task label")).toBeInTheDocument();
		});
		await user.keyboard("Goal{Enter}");
		await waitFor(() => expect(screen.getByText("Goal")).toBeInTheDocument());

		// jsdom containers have zero dimensions; mock so toPng receives a valid size
		const canvas = getCanvas() as HTMLElement;
		vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
			width: 800,
			height: 600,
			x: 0,
			y: 0,
			top: 0,
			left: 0,
			right: 800,
			bottom: 600,
			toJSON: () => undefined,
		});

		await user.click(
			screen.getByRole("button", { name: "Export as image (X)" }),
		);

		await waitFor(() => {
			expect(toPng).toHaveBeenCalled();
		});
		clickSpy.mockRestore();
	});
});
