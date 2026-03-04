import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LicenseGateway } from "../model/license";
import {
	configureLicenseGateway,
	resetLicenseStore,
} from "../store/license-store";
import { LicenseModal } from "./LicenseModal";

function fakeGateway(overrides: Partial<LicenseGateway> = {}): LicenseGateway {
	return {
		validateLicense: vi.fn(() => Promise.resolve({ valid: true })),
		...overrides,
	};
}

const noop = () => {
	// do nothing
};

function renderModal() {
	return render(
		<LicenseModal onClose={noop} purchaseUrl="https://example.com/buy" />,
	);
}

describe("LicenseModal", () => {
	afterEach(() => {
		cleanup();
		resetLicenseStore();
		localStorage.clear();
	});

	it("shows activation form when no license is active", () => {
		configureLicenseGateway(fakeGateway());
		renderModal();

		expect(screen.getByLabelText("License key")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Activate License" }),
		).toBeInTheDocument();
		expect(screen.getByText("Get one here!")).toBeInTheDocument();
	});

	it("disables activate button when input is empty", () => {
		configureLicenseGateway(fakeGateway());
		renderModal();

		expect(
			screen.getByRole("button", { name: "Activate License" }),
		).toBeDisabled();
	});

	it("activates a valid license key", async () => {
		const activate = vi.fn(() => Promise.resolve({ valid: true }));
		configureLicenseGateway(fakeGateway({ validateLicense: activate }));
		const user = userEvent.setup();
		renderModal();

		await user.type(screen.getByLabelText("License key"), "VALID-KEY-1234");
		await user.click(screen.getByRole("button", { name: "Activate License" }));

		await waitFor(() => {
			expect(screen.getByText("License active")).toBeInTheDocument();
		});
		expect(activate).toHaveBeenCalledWith("VALID-KEY-1234");
	});

	it("shows error for an invalid license key", async () => {
		configureLicenseGateway(
			fakeGateway({
				validateLicense: vi.fn(() => Promise.resolve({ valid: false })),
			}),
		);
		const user = userEvent.setup();
		renderModal();

		await user.type(screen.getByLabelText("License key"), "BAD-KEY");
		await user.click(screen.getByRole("button", { name: "Activate License" }));

		await waitFor(() => {
			expect(screen.getByRole("alert")).toHaveTextContent(
				"Invalid license key.",
			);
		});
	});

	it("shows error when activation fails due to network", async () => {
		configureLicenseGateway(
			fakeGateway({
				validateLicense: vi.fn(() =>
					Promise.reject(new Error("Network error")),
				),
			}),
		);
		const user = userEvent.setup();
		renderModal();

		await user.type(screen.getByLabelText("License key"), "SOME-KEY");
		await user.click(screen.getByRole("button", { name: "Activate License" }));

		await waitFor(() => {
			expect(screen.getByRole("alert")).toHaveTextContent(
				"Could not reach the license server.",
			);
		});
	});

	it("shows 'Activating...' while activation is in progress", async () => {
		let resolveActivation!: (value: { valid: boolean }) => void;
		configureLicenseGateway(
			fakeGateway({
				validateLicense: vi.fn(
					() =>
						new Promise<{ valid: boolean }>((resolve) => {
							resolveActivation = resolve;
						}),
				),
			}),
		);
		const user = userEvent.setup();
		renderModal();

		await user.type(screen.getByLabelText("License key"), "SOME-KEY");
		await user.click(screen.getByRole("button", { name: "Activate License" }));

		expect(
			screen.getByRole("button", { name: "Activating..." }),
		).toBeDisabled();

		resolveActivation({ valid: true });

		await waitFor(() => {
			expect(screen.getByText("License active")).toBeInTheDocument();
		});
	});

	it("allows removing an active license", async () => {
		configureLicenseGateway(fakeGateway());
		const user = userEvent.setup();
		renderModal();

		await user.type(screen.getByLabelText("License key"), "VALID-KEY");
		await user.click(screen.getByRole("button", { name: "Activate License" }));
		await waitFor(() => {
			expect(screen.getByText("License active")).toBeInTheDocument();
		});

		await user.click(screen.getByText("Remove license"));

		await waitFor(() => {
			expect(screen.getByLabelText("License key")).toBeInTheDocument();
		});
	});

	it("persists license across modal re-renders", async () => {
		configureLicenseGateway(fakeGateway());
		const user = userEvent.setup();
		const { unmount } = renderModal();

		await user.type(screen.getByLabelText("License key"), "VALID-KEY");
		await user.click(screen.getByRole("button", { name: "Activate License" }));
		await waitFor(() => {
			expect(screen.getByText("License active")).toBeInTheDocument();
		});

		unmount();
		renderModal();

		expect(screen.getByText("License active")).toBeInTheDocument();
	});

	it("links to the purchase page", () => {
		configureLicenseGateway(fakeGateway());
		renderModal();

		const link = screen.getByText("Get one here!");
		expect(link).toHaveAttribute("href", "https://example.com/buy");
		expect(link).toHaveAttribute("target", "_blank");
	});
});
