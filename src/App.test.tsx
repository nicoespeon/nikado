import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders welcome message", () => {
		render(<App />);
		expect(screen.getByText("Welcome to Nikado")).toBeInTheDocument();
	});

	it("displays initial count", () => {
		render(<App />);
		expect(screen.getByText(/count is 0/i)).toBeInTheDocument();
	});

	it("increments count when button is clicked", async () => {
		const user = userEvent.setup();
		render(<App />);

		const button = screen.getByRole("button", { name: /count is 0/i });
		await user.click(button);

		expect(screen.getByText(/count is 1/i)).toBeInTheDocument();
	});
});
