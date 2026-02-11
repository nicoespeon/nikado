import "@testing-library/jest-dom/vitest";
import { cft } from "console-fail-test";

// React 19's scheduler emits console.timeStamp calls internally — allow them.
cft({ console: { timeStamp: true } });

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
