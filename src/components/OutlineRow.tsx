import { memo, useEffect, useRef, useState } from "react";
import {
	MAX_LABEL_LENGTH,
	createTaskLabel,
	findChildren,
	findLeafTasks,
	findParent,
	type MikadoGraph,
	type TaskId,
} from "../model/graph";
import { useGraphStore } from "../store/graph-store";

type OutlineRowProps = {
	taskId: TaskId;
	depth: number;
	isGoal: boolean;
	isSelected: boolean;
};

const DEFAULT_LABEL = createTaskLabel("Do something great");

function OutlineRowComponent({
	taskId,
	depth,
	isGoal,
	isSelected,
}: OutlineRowProps) {
	const task = useGraphStore((s) => s.tasks.find((t) => t.id === taskId));
	const graph = useGraphStore();
	const hasChildren = findChildren(graph, taskId).length > 0;
	const isCollapsed = useGraphStore((s) => s.collapsedNodes.has(taskId));
	const childCount = findChildren(graph, taskId).length;
	const isLeaf = isLeafTask(graph, taskId);
	const isDone = task?.status === "done";
	const isParked = task?.status === "parked";

	const editingNodeId = useGraphStore((s) => s.editingNodeId);
	const isEditing = editingNodeId === taskId;
	const setTaskLabel = useGraphStore((s) => s.setTaskLabel);
	const stopEditing = useGraphStore((s) => s.stopEditing);
	const undo = useGraphStore((s) => s.undo);
	const toggleDone = useGraphStore((s) => s.toggleDone);
	const selectNode = useGraphStore((s) => s.selectNode);
	const toggleCollapse = useGraphStore((s) => s.toggleCollapse);

	const [draft, setDraft] = useState<string>(task?.label ?? DEFAULT_LABEL);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const rowRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!isEditing) return;

		setDraft(task?.label ?? DEFAULT_LABEL);
		const timer = setTimeout(() => {
			textareaRef.current?.focus();
			textareaRef.current?.select();
		}, 0);
		return () => {
			clearTimeout(timer);
		};
	}, [isEditing, task?.label]);

	useEffect(() => {
		if (!isEditing) return;
		rowRef.current?.scrollIntoView({ block: "center" });
	}, [isEditing]);

	if (!task) return null;

	const label = task.label || DEFAULT_LABEL;

	function confirmEdit() {
		if (!draft.trim()) {
			cancelEdit();
			return;
		}
		setTaskLabel(taskId, draft);
		stopEditing();
	}

	function cancelEdit() {
		if (!task?.label) {
			const parentId = findParent(useGraphStore.getState(), taskId);
			undo();
			if (parentId) useGraphStore.getState().selectNode(parentId);
			return;
		}
		setDraft(task.label);
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
	}

	return (
		<div
			ref={rowRef}
			role="treeitem"
			aria-level={depth + 1}
			aria-selected={isSelected}
			style={{ paddingLeft: `${String(depth * 1.5)}rem` }}
			className={`flex items-center gap-2 px-3 py-2 min-h-[44px] ${rowStyles(isLeaf, isDone, isParked, isSelected)}`}
			onClick={() => {
				selectNode(taskId);
			}}
		>
			{hasChildren ? (
				<button
					type="button"
					aria-label={
						isCollapsed
							? `Expand ${String(childCount)} subtasks`
							: "Collapse subtasks"
					}
					aria-expanded={!isCollapsed}
					onClick={(e) => {
						e.stopPropagation();
						toggleCollapse(taskId);
					}}
					className="shrink-0 w-6 h-6 flex items-center justify-center text-gray-400 dark:text-gray-500"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						{isCollapsed ? (
							<path d="m9 18 6-6-6-6" />
						) : (
							<path d="m6 9 6 6 6-6" />
						)}
					</svg>
				</button>
			) : (
				<span className="shrink-0 w-6" />
			)}

			{!isEditing && (
				<button
					type="button"
					aria-label={isDone ? "Mark undone" : "Mark done"}
					aria-pressed={isDone}
					onClick={(e) => {
						e.stopPropagation();
						toggleDone(taskId);
					}}
					className={`shrink-0 w-5 h-5 rounded border flex items-center justify-center text-xs ${
						isDone
							? "bg-green-500 border-green-600 dark:bg-green-600 dark:border-green-500 text-white"
							: "border-gray-400 hover:border-gray-600 dark:border-gray-500 dark:hover:border-gray-400"
					}`}
				>
					{isDone ? "\u2713" : ""}
				</button>
			)}

			{isEditing ? (
				<div className="flex-1 min-w-0 relative">
					<textarea
						ref={textareaRef}
						aria-label="Task label"
						maxLength={MAX_LABEL_LENGTH}
						rows={1}
						className="w-full border border-blue-400 dark:border-blue-500 rounded px-2 py-1 bg-white dark:bg-gray-800 text-sm outline-none resize-none overflow-hidden"
						value={draft}
						onChange={(e) => {
							setDraft(e.target.value);
						}}
						onKeyDown={handleKeyDown}
						onBlur={confirmEdit}
					/>
					<span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 block text-right">
						{draft.length}/{MAX_LABEL_LENGTH}
					</span>
				</div>
			) : (
				<span
					className={`${isGoal ? "text-lg font-semibold" : "text-sm"} ${isSelected ? "font-semibold" : ""} ${isDone ? "line-through opacity-60" : ""}`}
				>
					{label}
				</span>
			)}
		</div>
	);
}

function isLeafTask(graph: MikadoGraph, taskId: TaskId) {
	const leaves = findLeafTasks(graph);
	return leaves.some((t) => t.id === taskId);
}

function rowStyles(
	isLeaf: boolean,
	isDone: boolean,
	isParked: boolean,
	isSelected: boolean,
) {
	const parts: string[] = [];

	if (isSelected) {
		parts.push(
			"border-l-4 border-l-blue-500 dark:border-l-blue-400 bg-blue-50 dark:bg-blue-950/30",
		);
	} else {
		parts.push("border-l-4");

		if (isDone) {
			parts.push("border-l-green-500 dark:border-l-green-600 opacity-60");
		} else if (isParked) {
			parts.push("border-l-gray-300 dark:border-l-gray-600 opacity-60");
		} else if (isLeaf) {
			parts.push(
				"border-l-amber-400 dark:border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20",
			);
		} else {
			parts.push("border-l-transparent");
		}
	}

	return parts.join(" ");
}

export const OutlineRow = memo(OutlineRowComponent);
