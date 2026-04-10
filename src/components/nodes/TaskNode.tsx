import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
	MAX_LABEL_LENGTH,
	canMoveTask,
	createTaskLabel,
	findParent,
} from "../../model/graph";
import { useGraphStore } from "../../store/graph-store";
import type { TaskNodeData } from "../../store/reactflow-bridge";

export type TaskNodeType = Node<TaskNodeData, "task">;

const DEFAULT_LABEL = createTaskLabel("Do something great");

function TaskNodeComponent({ data, selected }: NodeProps<TaskNodeType>) {
	const setTaskLabel = useGraphStore((s) => s.setTaskLabel);
	const toggleDone = useGraphStore((s) => s.toggleDone);
	const editingNodeId = useGraphStore((s) => s.editingNodeId);
	const stopEditing = useGraphStore((s) => s.stopEditing);
	const undo = useGraphStore((s) => s.undo);
	const movingNodeId = useGraphStore((s) => s.movingNodeId);
	const isEditing = editingNodeId === data.taskId;
	const isDone = data.status === "done";
	const isBeingMoved = movingNodeId === data.taskId;
	const isInvalidMoveTarget =
		movingNodeId !== null &&
		!isBeingMoved &&
		!canMoveTask(useGraphStore.getState(), movingNodeId, data.taskId);
	const [draft, setDraft] = useState<string>(data.label || DEFAULT_LABEL);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const prevStatusRef = useRef(data.status);
	const [justCompleted, setJustCompleted] = useState(false);

	useEffect(() => {
		if (data.status === "done" && prevStatusRef.current !== "done") {
			setJustCompleted(true);
		}
		prevStatusRef.current = data.status;
	}, [data.status]);

	const clearBounce = useCallback(() => {
		setJustCompleted(false);
	}, []);

	useEffect(() => {
		if (!isEditing) return;

		setDraft(data.label || DEFAULT_LABEL);
		const timer = setTimeout(() => {
			textareaRef.current?.focus();
			textareaRef.current?.select();
		}, 0);
		return () => {
			clearTimeout(timer);
		};
	}, [isEditing, data.label]);

	function confirmEdit() {
		if (!draft.trim()) {
			cancelEdit();
			return;
		}
		setTaskLabel(data.taskId, draft);
		stopEditing();
	}

	function cancelEdit() {
		if (!data.label) {
			const parentId = findParent(useGraphStore.getState(), data.taskId);
			undo();
			if (parentId) useGraphStore.getState().selectNode(parentId);
			return;
		}
		setDraft(data.label);
		stopEditing();
	}

	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key === "Enter") {
			e.preventDefault();
			e.stopPropagation();
			confirmEdit();
		}
		if (e.key === "Escape") {
			e.stopPropagation();
			cancelEdit();
		}
		if (e.key === "Tab") {
			e.preventDefault();
			e.stopPropagation();
			confirmEdit();
		}
	}

	const focusRing = selected
		? "ring-2 ring-blue-500 dark:ring-blue-400 ring-offset-2 dark:ring-offset-gray-900"
		: "";

	const moveStyles = isBeingMoved
		? "border-dashed! opacity-50"
		: isInvalidMoveTarget
			? "opacity-30"
			: "";

	const bounceStyle = justCompleted
		? { animation: "task-bounce 350ms ease-out" }
		: undefined;

	return (
		<div
			data-status={data.status}
			data-leaf={data.isLeaf}
			style={bounceStyle}
			onAnimationEnd={clearBounce}
			className={`rounded-lg shadow-sm w-fit min-w-20 max-w-75 ${statusStyles(data.status, data.isGoal, data.isLeaf)} ${focusRing} ${moveStyles}`}
		>
			{renderHandles(data.isGoal)}
			{isEditing ? (
				<div className="relative">
					<span
						className="invisible whitespace-pre-wrap wrap-break-word"
						aria-hidden="true"
					>
						{draft || " "}
					</span>
					<textarea
						ref={textareaRef}
						aria-label="Task label"
						maxLength={MAX_LABEL_LENGTH}
						className="nodrag absolute inset-0 border-0 p-0 bg-transparent outline-none resize-none overflow-hidden whitespace-pre-wrap wrap-break-word"
						value={draft}
						onChange={(e) => {
							setDraft(e.target.value);
						}}
						onKeyDown={handleKeyDown}
						onBlur={confirmEdit}
					/>
				</div>
			) : (
				<div className="flex items-center gap-2">
					<button
						type="button"
						tabIndex={-1}
						title={isDone ? "Mark undone (D)" : "Mark done (D)"}
						aria-label={isDone ? "Mark undone" : "Mark done"}
						aria-pressed={isDone}
						onClick={(e) => {
							e.stopPropagation();
							toggleDone(data.taskId);
						}}
						className={`nodrag w-4 h-4 shrink-0 rounded border ${
							isDone
								? "bg-green-500 border-green-600 dark:bg-green-600 dark:border-green-500 text-white"
								: "border-gray-400 hover:border-gray-600 dark:border-gray-500 dark:hover:border-gray-400"
						} flex items-center justify-center text-xs`}
					>
						{isDone && <AnimatedCheckmark animate={justCompleted} />}
					</button>
					<span className="wrap-break-word">{data.label || DEFAULT_LABEL}</span>
					{data.hasChildren && (
						<CollapseButton
							taskId={data.taskId}
							isCollapsed={data.isCollapsed}
							childCount={data.childCount}
						/>
					)}
				</div>
			)}
			{isEditing && (
				<span className="absolute right-2 bottom-px text-[7px] text-gray-400 dark:text-gray-500 pointer-events-none">
					{draft.length}/{MAX_LABEL_LENGTH}
				</span>
			)}
		</div>
	);
}

function CollapseButton({
	taskId,
	isCollapsed,
	childCount,
}: {
	taskId: TaskNodeData["taskId"];
	isCollapsed: boolean;
	childCount: number;
}) {
	const toggleCollapse = useGraphStore((s) => s.toggleCollapse);
	const label = isCollapsed
		? `Expand ${String(childCount)} subtasks (H)`
		: "Collapse subtasks (H)";

	return (
		<button
			type="button"
			tabIndex={-1}
			title={label}
			aria-label={label}
			aria-expanded={!isCollapsed}
			data-collapse-toggle
			onClick={(e) => {
				e.stopPropagation();
				toggleCollapse(taskId);
			}}
			className="nodrag ml-1 shrink-0 flex items-center gap-0.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 text-xs"
		>
			{isCollapsed ? (
				<div className="relative">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="12"
						height="12"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="m9 18 6-6-6-6" />
					</svg>
				</div>
			) : (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="12"
					height="12"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path d="m6 9 6 6 6-6" />
				</svg>
			)}
		</button>
	);
}

function statusStyles(status: string, isGoal: boolean, isLeaf: boolean) {
	const size = isGoal
		? "border-2 px-6 py-3 text-lg font-semibold"
		: "border px-4 py-2 text-sm";

	if (status === "done") {
		return `${size} border-green-500 bg-green-50 dark:border-green-600 dark:bg-green-950 opacity-60`;
	}

	return isLeaf
		? `${size} border-amber-400 bg-amber-50 dark:border-amber-500 dark:bg-amber-950`
		: `${size} border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800`;
}

function AnimatedCheckmark({ animate }: { animate: boolean }) {
	const strokeStyle = animate
		? {
				strokeDasharray: 16,
				strokeDashoffset: 16,
				animation: "checkmark-draw 250ms 80ms ease-out forwards",
			}
		: undefined;

	return (
		<svg width="10" height="10" viewBox="0 0 12 12" fill="none">
			<path
				d="M2 6l3 3 5-5"
				stroke="currentColor"
				strokeWidth="2.5"
				strokeLinecap="round"
				strokeLinejoin="round"
				style={strokeStyle}
			/>
		</svg>
	);
}

function renderHandles(isGoal: boolean) {
	if (isGoal) {
		return <Handle type="source" position={Position.Right} id="right" />;
	}

	return (
		<>
			<Handle type="target" position={Position.Left} id="left" />
			<Handle type="source" position={Position.Right} id="right" />
		</>
	);
}

export const TaskNode = memo(TaskNodeComponent);
