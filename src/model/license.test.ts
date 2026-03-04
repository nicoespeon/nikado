import { describe, expect, it } from "vitest";
import { needsRevalidation } from "./license";

describe("needsRevalidation", () => {
	const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

	it("returns false when validated less than 7 days ago", () => {
		const validatedAt = Date.now() - SEVEN_DAYS_MS + 1000;
		expect(needsRevalidation(validatedAt)).toBe(false);
	});

	it("returns true when validated more than 7 days ago", () => {
		const validatedAt = Date.now() - SEVEN_DAYS_MS - 1000;
		expect(needsRevalidation(validatedAt)).toBe(true);
	});

	it("returns false at exactly 7 days (boundary)", () => {
		const now = 1_000_000_000;
		const validatedAt = now - SEVEN_DAYS_MS;
		expect(needsRevalidation(validatedAt, now)).toBe(false);
	});

	it("returns true one millisecond past 7 days", () => {
		const now = 1_000_000_000;
		const validatedAt = now - SEVEN_DAYS_MS - 1;
		expect(needsRevalidation(validatedAt, now)).toBe(true);
	});
});
