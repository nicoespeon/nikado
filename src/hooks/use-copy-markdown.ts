import { useSyncExternalStore } from "react";
import { type MikadoGraph, toMarkdown } from "../model/graph";

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

export function copyMarkdown(graph: MikadoGraph) {
	const md = toMarkdown(graph);
	void navigator.clipboard.writeText(md).then(() => {
		clearTimeout(timeoutId);
		copied = true;
		notify();
		timeoutId = setTimeout(() => {
			copied = false;
			notify();
		}, FEEDBACK_MS);
	});
}

export function resetMarkdownCopy() {
	clearTimeout(timeoutId);
	copied = false;
	notify();
}

export function useMarkdownCopied() {
	return useSyncExternalStore(subscribe, getCopiedSnapshot);
}
