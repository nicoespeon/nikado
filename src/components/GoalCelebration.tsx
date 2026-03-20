import confetti from "canvas-confetti";
import { useEffect, useRef } from "react";
import { useGraphStore } from "../store/graph-store";

export function GoalCelebration() {
	const goalId = useGraphStore((s) => s.goalId);
	const goalStatus = useGraphStore(
		(s) => s.tasks.find((t) => t.id === s.goalId)?.status,
	);
	const prevGoalStatusRef = useRef(goalStatus);

	useEffect(() => {
		const wasNotDone = prevGoalStatusRef.current !== "done";
		prevGoalStatusRef.current = goalStatus;

		if (goalId && goalStatus === "done" && wasNotDone) {
			celebrate();
		}
	}, [goalId, goalStatus]);

	return null;
}

function celebrate() {
	const defaults = {
		spread: 60,
		ticks: 80,
		gravity: 1.2,
		decay: 0.94,
		startVelocity: 20,
		colors: ["#7bc043", "#0392cf", "#ffd700", "#ff6b6b", "#a78bfa"],
	};

	void confetti({ ...defaults, particleCount: 30, origin: { x: 0.3, y: 0.5 } });
	void confetti({ ...defaults, particleCount: 30, origin: { x: 0.7, y: 0.5 } });

	setTimeout(() => {
		void confetti({
			...defaults,
			particleCount: 20,
			origin: { x: 0.5, y: 0.4 },
			spread: 90,
		});
	}, 150);
}
