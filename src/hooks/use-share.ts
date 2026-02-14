import { useSyncExternalStore } from "react";

const FEEDBACK_MS = 2000;

let copied = false;
let timeoutId: ReturnType<typeof setTimeout>;
const listeners = new Set<() => void>();

function notify() {
	for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

function getCopiedSnapshot() {
	return copied;
}

export function copyUrl() {
	void navigator.clipboard.writeText(window.location.href).then(() => {
		clearTimeout(timeoutId);
		copied = true;
		notify();
		timeoutId = setTimeout(() => {
			copied = false;
			notify();
		}, FEEDBACK_MS);
	});
}

export function resetShare() {
	clearTimeout(timeoutId);
	copied = false;
	notify();
}

export function useCopied() {
	return useSyncExternalStore(subscribe, getCopiedSnapshot);
}
