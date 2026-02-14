import { describe, expect, test } from "vitest";
import { deriveFilename } from "./export-image";

const now = new Date("2025-06-15T12:00:00Z");

describe("deriveFilename", () => {
	test("returns nikado-graph with date when no label is provided", () => {
		expect(deriveFilename(undefined, now)).toBe("nikado-graph-2025-06-15.png");
	});

	test("returns nikado-graph with date for an empty string", () => {
		expect(deriveFilename("", now)).toBe("nikado-graph-2025-06-15.png");
	});

	test("sanitizes the goal label into a filename with date suffix", () => {
		expect(deriveFilename("Refactor auth module", now)).toBe(
			"refactor-auth-module-2025-06-15.png",
		);
	});

	test("strips filesystem-unsafe characters", () => {
		expect(deriveFilename('Goal: "fix" <all> bugs?', now)).toBe(
			"goal-fix-all-bugs-2025-06-15.png",
		);
	});

	test("collapses multiple spaces into a single dash", () => {
		expect(deriveFilename("too   many   spaces", now)).toBe(
			"too-many-spaces-2025-06-15.png",
		);
	});

	test("truncates long labels to 80 characters", () => {
		const longLabel = "a".repeat(100);
		const filename = deriveFilename(longLabel, now);
		expect(filename).toBe(`${"a".repeat(80)}-2025-06-15.png`);
	});

	test("returns nikado-graph with date when label is only unsafe characters", () => {
		expect(deriveFilename(':<>"/\\|?*', now)).toBe(
			"nikado-graph-2025-06-15.png",
		);
	});
});
