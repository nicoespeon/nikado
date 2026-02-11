import { cleanup, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
	beforeEach(() => {
		cleanup();
	});

	it("renders ReactFlow canvas", () => {
		render(<App />);
		const canvas = document.querySelector(".react-flow");
		expect(canvas).toBeInTheDocument();
	});

	it("renders with empty canvas initially", () => {
		render(<App />);
		const nodes = document.querySelectorAll(".react-flow__node");
		expect(nodes).toHaveLength(0);
	});

	it("creates a new node on double-click", async () => {
		const user = userEvent.setup();
		render(<App />);

		const canvas = document.querySelector(".react-flow");
		expect(canvas).toBeInTheDocument();

		if (canvas) {
			await user.dblClick(canvas);

			await waitFor(() => {
				const nodes = document.querySelectorAll(".react-flow__node");
				expect(nodes.length).toBeGreaterThan(0);
			});
		}
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
