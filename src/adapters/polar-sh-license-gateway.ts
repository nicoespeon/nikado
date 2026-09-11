import { Polar } from "@polar-sh/sdk";
import { ResourceNotFound } from "@polar-sh/sdk/models/errors/resourcenotfound.js";
import type { LicenseGateway } from "../model/license";

const ORGANIZATION_ID = "70465d9c-03f3-413f-bb42-a87c292c1d4c";

const polar = new Polar();

export const polarLicenseGateway: LicenseGateway = {
	async validateLicense(key) {
		try {
			const result = await polar.customerPortal.licenseKeys.validate({
				key,
				organizationId: ORGANIZATION_ID,
			});
			return { valid: result.status === "granted" };
		} catch (error) {
			// Polar answers 404 for unknown keys. Other errors mean we couldn't check.
			if (error instanceof ResourceNotFound) return { valid: false };
			throw error;
		}
	},
};
