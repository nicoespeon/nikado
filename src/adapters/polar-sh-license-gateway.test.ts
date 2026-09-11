import { afterEach, describe, expect, it, vi } from "vitest";
import { polarLicenseGateway } from "./polar-sh-license-gateway";

describe("polarLicenseGateway", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("reports a granted key as valid", async () => {
		respondWith(200, grantedLicenseKey());

		const result = await polarLicenseGateway.validateLicense("SOME-KEY");

		expect(result).toEqual({ valid: true });
	});

	it("reports an unknown key as invalid", async () => {
		respondWith(404, { error: "ResourceNotFound", detail: "Not found" });

		const result = await polarLicenseGateway.validateLicense("UNKNOWN-KEY");

		expect(result).toEqual({ valid: false });
	});

	it("fails when Polar is unreachable", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))),
		);

		await expect(
			polarLicenseGateway.validateLicense("SOME-KEY"),
		).rejects.toThrow();
	});

	it("fails when Polar has a server error", async () => {
		respondWith(500, { error: "InternalServerError" });

		await expect(
			polarLicenseGateway.validateLicense("SOME-KEY"),
		).rejects.toThrow();
	});

	it("fails when Polar changes the response contract", async () => {
		respondWith(200, { status: "granted" });

		await expect(
			polarLicenseGateway.validateLicense("SOME-KEY"),
		).rejects.toThrow();
	});
});

function respondWith(status: number, body: unknown) {
	vi.stubGlobal(
		"fetch",
		vi.fn(() =>
			Promise.resolve(
				new Response(JSON.stringify(body), {
					status,
					headers: { "Content-Type": "application/json" },
				}),
			),
		),
	);
}

function grantedLicenseKey() {
	const organizationId = "70465d9c-03f3-413f-bb42-a87c292c1d4c";
	const customerId = "9f4f6a1e-1b6e-4c1a-9a3e-2f4b8c7d6e5f";
	return {
		id: "3c2b1a09-8f7e-4d6c-b5a4-938271605f4e",
		created_at: "2026-01-01T00:00:00Z",
		modified_at: null,
		organization_id: organizationId,
		customer_id: customerId,
		customer: {
			id: customerId,
			created_at: "2026-01-01T00:00:00Z",
			modified_at: null,
			metadata: {},
			email: "customer@example.com",
			email_verified: true,
			name: null,
			billing_address: null,
			tax_id: null,
			organization_id: organizationId,
			deleted_at: null,
			avatar_url: "https://example.com/avatar.png",
		},
		benefit_id: "5e4d3c2b-1a09-4f8e-a7d6-c5b4a3928170",
		key: "SOME-KEY",
		display_key: "****-KEY",
		status: "granted",
		limit_activations: null,
		usage: 0,
		limit_usage: null,
		validations: 1,
		last_validated_at: null,
		expires_at: null,
	};
}
