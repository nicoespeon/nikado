import { afterEach, describe, expect, it, vi } from "vitest";
import { polarLicenseGateway } from "../adapters/polar-sh-license-gateway";
import {
	configureLicenseGateway,
	resetLicenseStore,
	useLicenseStore,
} from "./license-store";

describe("license store", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		resetLicenseStore();
	});

	it("keeps a stale license when Polar is down during revalidation", async () => {
		configureLicenseGateway(polarLicenseGateway);
		const staleLicense = {
			status: "active",
			licenseKey: "PAID-KEY",
			validatedAt: 0,
		} as const;
		useLicenseStore.setState({ license: staleLicense });
		vi.stubGlobal(
			"fetch",
			vi.fn(() => Promise.resolve(new Response(null, { status: 503 }))),
		);

		await useLicenseStore.getState().revalidateIfNeeded();

		expect(useLicenseStore.getState().license).toEqual(staleLicense);
	});
});
