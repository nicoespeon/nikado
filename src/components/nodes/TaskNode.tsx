import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { memo, useEffect, useRef, useState } from "react";
import { useGraphStore } from "../../store/graph-store";
import type { TaskNodeData } from "../../store/reactflow-bridge";

export type TaskNodeType = Node<TaskNodeData, "task">;

const DEFAULT_LABEL = "Do something great";

function TaskNodeComponent({ data }: NodeProps<TaskNodeType>) {
	const setTaskLabel = useGraphStore((s) => s.setTaskLabel);
	const addSubTask = useGraphStore((s) => s.addSubTask);
	const [isEditing, setIsEditing] = useState(!data.label);
	const [draft, setDraft] = useState(data.label || DEFAULT_LABEL);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (!isEditing) return;

		// Defer focus to next tick so it runs after ReactFlow's event handlers
		const timer = setTimeout(() => {
			inputRef.current?.focus();
			inputRef.current?.select();
		}, 0);
		return () => {
			clearTimeout(timer);
		};
	}, [isEditing]);

	function confirmEdit() {
		setTaskLabel(data.taskId, draft || DEFAULT_LABEL);
		setIsEditing(false);
	}

	function cancelEdit() {
		const fallback = data.label || DEFAULT_LABEL;
		setDraft(fallback);
		if (!data.label) {
			setTaskLabel(data.taskId, DEFAULT_LABEL);
		}
		setIsEditing(false);
	}

	function startEditing() {
		setDraft(data.label);
		setIsEditing(true);
	}

	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key === "Enter") confirmEdit();
		if (e.key === "Escape") cancelEdit();
	}

	const taskClassName = data.isGoal
		? "border-2 border-blue-600 bg-blue-50 px-6 py-3 text-lg font-semibold"
		: "border border-gray-300 bg-white px-4 py-2 text-sm";

	function handleAddSubTask() {
		addSubTask(data.taskId, "");
	}

	return (
		<div className={`rounded-lg shadow-sm ${taskClassName}`}>
			<Handle type="target" position={Position.Top} />
			{isEditing ? (
				<input
					ref={inputRef}
					aria-label="Task label"
					className="nodrag bg-transparent outline-none w-full"
					value={draft}
					onChange={(e) => {
						setDraft(e.target.value);
					}}
					onKeyDown={handleKeyDown}
					onBlur={confirmEdit}
				/>
			) : (
				<div className="flex items-center gap-2">
					<span
						role="button"
						tabIndex={0}
						onClick={() => {
							startEditing();
						}}
						onKeyDown={(e) => {
							if (e.key === "Enter") startEditing();
						}}
					>
						{data.label || DEFAULT_LABEL}
					</span>
					<button
						aria-label="Add sub-task"
						className="nodrag ml-1 text-gray-400 hover:text-gray-700 text-sm leading-none"
						onClick={handleAddSubTask}
					>
						+
					</button>
				</div>
			)}
			<Handle type="source" position={Position.Bottom} />
		</div>
	);
}

export const TaskNode = memo(TaskNodeComponent);
