import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { memo, useEffect, useRef, useState } from "react";
import {
	MAX_LABEL_LENGTH,
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
	const isEditing = editingNodeId === data.taskId;
	const isDone = data.status === "done";
	const [draft, setDraft] = useState<string>(data.label || DEFAULT_LABEL);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

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
		setTaskLabel(data.taskId, draft || DEFAULT_LABEL);
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

	return (
		<div
			data-status={data.status}
			data-leaf={data.isLeaf}
			className={`rounded-lg shadow-sm w-fit min-w-[80px] max-w-[300px] ${statusStyles(data.status, data.isGoal, data.isLeaf)} ${focusRing}`}
		>
			{renderHandles(data.isGoal)}
			{isEditing ? (
				<div className="relative">
					<span
						className="invisible whitespace-pre-wrap break-words"
						aria-hidden="true"
					>
						{draft || " "}
					</span>
					<textarea
						ref={textareaRef}
						aria-label="Task label"
						maxLength={MAX_LABEL_LENGTH}
						className="nodrag absolute inset-0 border-0 p-0 bg-transparent outline-none resize-none overflow-hidden whitespace-pre-wrap break-words"
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
						aria-label="Done"
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
						{isDone ? "\u2713" : ""}
					</button>
					<span className="break-words">{data.label || DEFAULT_LABEL}</span>
				</div>
			)}
			{isEditing && (
				<span className="absolute -bottom-1 right-2 text-[7px] text-gray-400 dark:text-gray-500 pointer-events-none">
					{draft.length}/{MAX_LABEL_LENGTH}
				</span>
			)}
		</div>
	);
}

function statusStyles(status: string, isGoal: boolean, isLeaf: boolean) {
	const goalSize = "border-2 px-6 py-3 text-lg font-semibold";
	const regularSize = "border px-4 py-2 text-sm";

	if (isGoal) {
		return status === "done"
			? `${goalSize} border-green-600 bg-green-50 dark:border-green-500 dark:bg-green-950 opacity-70`
			: `${goalSize} border-blue-600 bg-blue-50 dark:border-blue-500 dark:bg-blue-950`;
	}

	if (status === "done") {
		return `${regularSize} border-green-500 bg-green-50 dark:border-green-600 dark:bg-green-950 opacity-60`;
	}

	return isLeaf
		? `${regularSize} border-amber-400 bg-amber-50 dark:border-amber-500 dark:bg-amber-950`
		: `${regularSize} border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800`;
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
