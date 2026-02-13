import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../App";
import { resetTheme } from "../hooks/use-theme";
import { useGraphStore } from "../store/graph-store";

function resetStore() {
	useGraphStore.setState({
		goalId: null,
		tasks: [],
		dependencies: [],
		editingNodeId: null,
		selectedNodeId: null,
	});
}

describe("Theme toggle", () => {
	afterEach(() => {
		cleanup();
		resetStore();
		localStorage.removeItem("nikado-theme");
		resetTheme();
	});

	it("renders a theme toggle button", () => {
		render(<App />);

		expect(screen.getByRole("button", { name: /theme/i })).toBeInTheDocument();
	});

	it("defaults to system theme", () => {
		render(<App />);

		expect(
			screen.getByRole("button", { name: "Theme: system" }),
		).toBeInTheDocument();
	});

	it("cycles from system to light to dark", async () => {
		const user = userEvent.setup();
		render(<App />);

		const button = screen.getByRole("button", { name: /theme/i });

		await user.click(button);
		expect(
			screen.getByRole("button", { name: "Theme: light" }),
		).toBeInTheDocument();

		await user.click(button);
		expect(
			screen.getByRole("button", { name: "Theme: dark" }),
		).toBeInTheDocument();

		await user.click(button);
		expect(
			screen.getByRole("button", { name: "Theme: system" }),
		).toBeInTheDocument();
	});

	it("applies dark class to document when set to dark", async () => {
		const user = userEvent.setup();
		render(<App />);

		const button = screen.getByRole("button", { name: /theme/i });

		// system -> light
		await user.click(button);
		// light -> dark
		await user.click(button);

		expect(document.documentElement.classList.contains("dark")).toBe(true);
	});

	it("removes dark class when set to light", async () => {
		const user = userEvent.setup();
		render(<App />);

		const button = screen.getByRole("button", { name: /theme/i });

		// system -> light
		await user.click(button);

		expect(document.documentElement.classList.contains("dark")).toBe(false);
	});

	it("persists theme preference to localStorage", async () => {
		const user = userEvent.setup();
		render(<App />);

		const button = screen.getByRole("button", { name: /theme/i });

		// system -> light
		await user.click(button);
		expect(localStorage.getItem("nikado-theme")).toBe("light");

		// light -> dark
		await user.click(button);
		expect(localStorage.getItem("nikado-theme")).toBe("dark");
	});

	it("cycles theme with 't' keyboard shortcut", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.keyboard("t");

		expect(
			screen.getByRole("button", { name: "Theme: light" }),
		).toBeInTheDocument();

		await user.keyboard("t");

		expect(
			screen.getByRole("button", { name: "Theme: dark" }),
		).toBeInTheDocument();
	});

	it("restores theme from localStorage on mount", () => {
		localStorage.setItem("nikado-theme", "dark");
		resetTheme();

		render(<App />);

		expect(
			screen.getByRole("button", { name: "Theme: dark" }),
		).toBeInTheDocument();
		expect(document.documentElement.classList.contains("dark")).toBe(true);
	});
});
