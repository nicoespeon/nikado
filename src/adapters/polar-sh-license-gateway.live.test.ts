import { describe, expect, it } from "vitest";
import { polarLicenseGateway } from "./polar-sh-license-gateway";

const testLicenseKey = process.env.POLAR_TEST_LICENSE_KEY ?? "";

// Hits the real Polar API: runs in the scheduled health check, not in regular test runs.
describe.skipIf(!testLicenseKey)("polarLicenseGateway on the real API", () => {
	it("accepts our test license key", async () => {
		const result = await polarLicenseGateway.validateLicense(testLicenseKey);

		expect(result).toEqual({ valid: true });
	});
});
