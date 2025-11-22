import "@testing-library/jest-dom/vitest";

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
