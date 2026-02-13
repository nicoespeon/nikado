import "@testing-library/jest-dom/vitest";
import { cft } from "console-fail-test";

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
