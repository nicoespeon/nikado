import { useEffect } from "react";
import { DesktopView } from "./DesktopView";
import { useIsMobile } from "./hooks/use-is-mobile";
import { useUrlSync } from "./hooks/use-url-sync";
import { MobileView } from "./MobileView";
import { useGraphStore } from "./store/graph-store";
import { useLicenseStore } from "./store/license-store";

const MAX_TITLE_LENGTH = 50;

function useDocumentTitle() {
	const goalLabel = useGraphStore((s) => {
		if (!s.goalId) return null;
		return s.tasks.find((t) => t.id === s.goalId)?.label ?? null;
	});

	useEffect(() => {
		if (!goalLabel) {
			document.title = "Nikado";
			return;
		}

		const trimmed =
			goalLabel.length > MAX_TITLE_LENGTH
				? goalLabel.slice(0, MAX_TITLE_LENGTH) + "\u2026"
				: goalLabel;
		document.title = `${trimmed} | Nikado`;
	}, [goalLabel]);
}

function App() {
	useDocumentTitle();
	useUrlSync();

	useEffect(() => {
		void useLicenseStore.getState().revalidateIfNeeded();
	}, []);

	const isMobile = useIsMobile();
	return isMobile ? <MobileView /> : <DesktopView />;
}

export { App };
