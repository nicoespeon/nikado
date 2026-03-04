import { Polar } from "@polar-sh/sdk";
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
			console.error("License validation error:", error);
			return { valid: false };
		}
	},
};
