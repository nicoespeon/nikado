import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { memo, useEffect, useRef, useState } from "react";
import { useGraphStore } from "../../store/graph-store";
import type { TaskNodeData } from "../../store/reactflow-bridge";

export type TaskNodeType = Node<TaskNodeData, "task">;

const DEFAULT_LABEL = "Do something great";

function TaskNodeComponent({ data, selected }: NodeProps<TaskNodeType>) {
	const setTaskLabel = useGraphStore((s) => s.setTaskLabel);
	const addSubTask = useGraphStore((s) => s.addSubTask);
	const startEditing = useGraphStore((s) => s.startEditing);
	const editingNodeId = useGraphStore((s) => s.editingNodeId);
	const stopEditing = useGraphStore((s) => s.stopEditing);
	const isEditing = editingNodeId === data.taskId;
	const [draft, setDraft] = useState(data.label || DEFAULT_LABEL);
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
		const fallback = data.label || DEFAULT_LABEL;
		setDraft(fallback);
		if (!data.label) {
			setTaskLabel(data.taskId, DEFAULT_LABEL);
		}
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
			const newTaskId = addSubTask(data.taskId, "");
			startEditing(newTaskId);
		}
	}

	const focusRing = selected ? "ring-2 ring-blue-500 ring-offset-2" : "";

	const taskClassName = data.isGoal
		? "border-2 border-blue-600 bg-blue-50 px-6 py-3 text-lg font-semibold"
		: "border border-gray-300 bg-white px-4 py-2 text-sm";

	return (
		<div
			className={`rounded-lg shadow-sm w-fit min-w-[80px] max-w-[300px] ${taskClassName} ${focusRing}`}
		>
			{renderHandles(data.isGoal, data.direction)}
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
				<span className="break-words">{data.label || DEFAULT_LABEL}</span>
			)}
		</div>
	);
}

function renderHandles(isGoal: boolean, direction: "left" | "right") {
	if (isGoal) {
		return (
			<>
				<Handle type="source" position={Position.Right} id="right" />
				<Handle type="source" position={Position.Left} id="left" />
			</>
		);
	}

	if (direction === "right") {
		return (
			<>
				<Handle type="target" position={Position.Left} id="left" />
				<Handle type="source" position={Position.Right} id="right" />
			</>
		);
	}

	return (
		<>
			<Handle type="target" position={Position.Right} id="right" />
			<Handle type="source" position={Position.Left} id="left" />
		</>
	);
}

export const TaskNode = memo(TaskNodeComponent);
