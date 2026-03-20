import "@testing-library/jest-dom/vitest";
import { cft } from "console-fail-test";
import { vi } from "vitest";

vi.mock("canvas-confetti", () => ({ default: vi.fn() }));

// React 19's scheduler emits console.timeStamp calls internally — allow them.
cft({ console: { timeStamp: true } });

// Mock matchMedia for theme detection
Object.defineProperty(window, "matchMedia", {
	value: (query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener() {
			// do nothing
		},
		removeListener() {
			// do nothing
		},
		addEventListener() {
			// do nothing
		},
		removeEventListener() {
			// do nothing
		},
		dispatchEvent: () => false,
	}),
});

// Mock clipboard API for share button
Object.assign(navigator, {
	clipboard: {
		writeText: () => Promise.resolve(),
		readText: () => Promise.resolve(""),
	},
});

// Mock scrollIntoView (not available in jsdom)
Element.prototype.scrollIntoView = () => {
	// do nothing
};

// Mock ResizeObserver for ReactFlow
global.ResizeObserver = class ResizeObserver {
	observe() {
		// do nothing
	}
	unobserve() {
		// do nothing
	}
	disconnect() {
		// do nothing
	}
};
