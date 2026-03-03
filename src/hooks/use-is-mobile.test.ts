import { renderHook, act } from "@testing-library/react";
import { describe, expect, test, vi, afterEach } from "vitest";
import { useIsMobile } from "./use-is-mobile";

function mockMatchMedia(matches: boolean) {
	const listeners: ((e: MediaQueryListEvent) => void)[] = [];
	const mql = {
		matches,
		media: "(max-width: 767px)",
		onchange: null,
		addListener() {
			// do nothing
		},
		removeListener() {
			// do nothing
		},
		addEventListener(_event: string, fn: (e: MediaQueryListEvent) => void) {
			listeners.push(fn);
		},
		removeEventListener(_event: string, fn: (e: MediaQueryListEvent) => void) {
			const index = listeners.indexOf(fn);
			if (index >= 0) listeners.splice(index, 1);
		},
		dispatchEvent: () => false,
	};

	vi.stubGlobal(
		"matchMedia",
		vi.fn(() => mql),
	);

	return {
		fireChange(newMatches: boolean) {
			mql.matches = newMatches;
			for (const fn of listeners) {
				fn({ matches: newMatches } as MediaQueryListEvent);
			}
		},
		getListenerCount() {
			return listeners.length;
		},
	};
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe("useIsMobile", () => {
	test("returns false when viewport is wide", () => {
		mockMatchMedia(false);

		const { result } = renderHook(() => useIsMobile());

		expect(result.current).toBe(false);
	});

	test("returns true when viewport is narrow", () => {
		mockMatchMedia(true);

		const { result } = renderHook(() => useIsMobile());

		expect(result.current).toBe(true);
	});

	test("updates when change event fires", () => {
		const mock = mockMatchMedia(false);

		const { result } = renderHook(() => useIsMobile());
		expect(result.current).toBe(false);

		act(() => {
			mock.fireChange(true);
		});
		expect(result.current).toBe(true);

		act(() => {
			mock.fireChange(false);
		});
		expect(result.current).toBe(false);
	});

	test("cleans up listener on unmount", () => {
		const mock = mockMatchMedia(false);

		const { unmount } = renderHook(() => useIsMobile());
		expect(mock.getListenerCount()).toBe(1);

		unmount();
		expect(mock.getListenerCount()).toBe(0);
	});
});
