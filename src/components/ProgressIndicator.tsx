import { useGraphStore } from "../store/graph-store";

const MIN_TASKS = 5;
const RING_SIZE = 20;
const STROKE_WIDTH = 2.5;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function useProgress() {
	const done = useGraphStore(
		(s) => s.tasks.filter((t) => t.status === "done").length,
	);
	const total = useGraphStore((s) => s.tasks.length);
	return { done, total };
}

export function ProgressRing() {
	const { done, total } = useProgress();

	if (total < MIN_TASKS) return null;

	const ratio = done / total;
	const offset = CIRCUMFERENCE * (1 - ratio);

	return (
		<div
			className="flex items-center gap-1.5 h-7 px-2 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-sm"
			role="status"
			aria-label={`Progress: ${String(done)} of ${String(total)} tasks done`}
		>
			<svg
				width={RING_SIZE}
				height={RING_SIZE}
				viewBox={`0 0 ${String(RING_SIZE)} ${String(RING_SIZE)}`}
				className="-rotate-90"
			>
				<circle
					cx={RING_SIZE / 2}
					cy={RING_SIZE / 2}
					r={RADIUS}
					fill="none"
					strokeWidth={STROKE_WIDTH}
					className="stroke-gray-200 dark:stroke-gray-600"
				/>
				<circle
					cx={RING_SIZE / 2}
					cy={RING_SIZE / 2}
					r={RADIUS}
					fill="none"
					strokeWidth={STROKE_WIDTH}
					strokeDasharray={CIRCUMFERENCE}
					strokeDashoffset={offset}
					strokeLinecap="round"
					className="stroke-green-500 dark:stroke-green-400 transition-[stroke-dashoffset] duration-300"
				/>
			</svg>
			<span className="text-xs font-medium text-gray-600 dark:text-gray-300 tabular-nums">
				{done}/{total}
			</span>
		</div>
	);
}

export function ProgressBar() {
	const { done, total } = useProgress();

	if (total < MIN_TASKS) return null;

	const percent = (done / total) * 100;

	return (
		<div
			className="h-1 bg-gray-200 dark:bg-gray-700"
			role="progressbar"
			aria-valuenow={done}
			aria-valuemin={0}
			aria-valuemax={total}
			aria-label={`Progress: ${String(done)} of ${String(total)} tasks done`}
		>
			<div
				className="h-full bg-green-500 dark:bg-green-400 transition-[width] duration-300"
				style={{ width: `${String(percent)}%` }}
			/>
		</div>
	);
}
