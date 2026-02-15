import { useEffect } from "react";
import {
	extractGraphData,
	serializeGraph,
	deserializeGraph,
} from "../model/url";
import { useGraphStore } from "../store/graph-store";

const DEBOUNCE_MS = 400;

export function useUrlSync() {
	useEffect(() => {
		const hash = window.location.hash.slice(1);
		if (hash) {
			const result = deserializeGraph(hash);
			if (result) {
				useGraphStore.setState({
					...result.graph,
					collapsedNodes: result.collapsedNodes,
				});
			}
		}

		let timeoutId: ReturnType<typeof setTimeout>;
		let lastSerialized = hash;

		const unsubscribe = useGraphStore.subscribe((state) => {
			clearTimeout(timeoutId);
			timeoutId = setTimeout(() => {
				const graphData = extractGraphData(state);

				if (graphData.goalId === null && graphData.tasks.length === 0) {
					if (lastSerialized) {
						lastSerialized = "";
						window.history.replaceState(null, "", window.location.pathname);
					}
					return;
				}

				const serialized = serializeGraph(graphData, state.collapsedNodes);
				if (serialized === lastSerialized) return;

				lastSerialized = serialized;
				window.history.replaceState(null, "", `#${serialized}`);
			}, DEBOUNCE_MS);
		});

		return () => {
			clearTimeout(timeoutId);
			unsubscribe();
		};
	}, []);
}
