import { useCallback, useEffect, useRef, useState } from "react";
import {
	findChildren,
	findParent,
	taskDepth,
	walkTree,
	type TaskId,
} from "../model/graph";
import { useGraphStore } from "../store/graph-store";
import { OutlineRow } from "./OutlineRow";

type ContextMenuState = {
	taskId: TaskId;
	y: number;
} | null;

function OutlineView() {
	const graph = useGraphStore();
	const collapsedNodes = useGraphStore((s) => s.collapsedNodes);
	const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
	const movingNodeId = useGraphStore((s) => s.movingNodeId);
	const orderedTasks = walkTree(graph, graph.goalId, collapsedNodes);
	const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);

	const handleLongPress = useCallback((taskId: TaskId, y: number) => {
		useGraphStore.getState().selectNode(taskId);
		setContextMenu({ taskId, y });
	}, []);

	const closeContextMenu = useCallback(() => {
		setContextMenu(null);
	}, []);

	const handleTapInMoveMode = useCallback((taskId: TaskId) => {
		useGraphStore.getState().confirmMove(taskId);
	}, []);

	return (
		<div role="tree" aria-label="Mikado graph">
			{orderedTasks.map((taskId) => (
				<OutlineRow
					key={taskId}
					taskId={taskId}
					depth={taskDepth(graph, taskId)}
					isGoal={taskId === graph.goalId}
					isSelected={taskId === selectedNodeId}
					movingNodeId={movingNodeId}
					onLongPress={movingNodeId ? undefined : handleLongPress}
					onTapInMoveMode={movingNodeId ? handleTapInMoveMode : undefined}
				/>
			))}
			{contextMenu && (
				<TaskContextMenu
					taskId={contextMenu.taskId}
					y={contextMenu.y}
					onClose={closeContextMenu}
				/>
			)}
		</div>
	);
}

type TaskContextMenuProps = {
	taskId: TaskId;
	y: number;
	onClose: () => void;
};

function TaskContextMenu({ taskId, y, onClose }: TaskContextMenuProps) {
	const menuRef = useRef<HTMLDivElement>(null);
	const graph = useGraphStore();
	const parentId = findParent(graph, taskId);
	const isGoal = taskId === graph.goalId;

	const siblings = parentId ? findChildren(graph, parentId) : [];
	const siblingIndex = siblings.indexOf(taskId);
	const canMoveUp = !isGoal && siblings.length > 1 && siblingIndex > 0;
	const canMoveDown =
		!isGoal && siblings.length > 1 && siblingIndex < siblings.length - 1;

	const hasChildren = findChildren(graph, taskId).length > 0;
	const canDissolve = !isGoal && hasChildren;
	const canInsertParent = !isGoal;
	const canMove = !isGoal;

	useEffect(() => {
		function handleClickOutside(e: MouseEvent | TouchEvent) {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				onClose();
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("touchstart", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("touchstart", handleClickOutside);
		};
	}, [onClose]);

	return (
		<div
			ref={menuRef}
			role="menu"
			aria-label="Task actions"
			className="fixed left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg py-1 min-w-40 select-none"
			style={{ top: `${String(y)}px` }}
		>
			<button
				type="button"
				role="menuitem"
				className="w-full text-left px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
				onClick={() => {
					graph.editTask(taskId);
					onClose();
				}}
			>
				Edit
			</button>
			{canInsertParent && (
				<button
					type="button"
					role="menuitem"
					className="w-full text-left px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
					onClick={() => {
						const newTaskId = graph.insertParent(taskId, "");
						if (newTaskId !== taskId) graph.startEditing(newTaskId);
						onClose();
					}}
				>
					Insert parent
				</button>
			)}
			{canMove && (
				<button
					type="button"
					role="menuitem"
					className="w-full text-left px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
					onClick={() => {
						graph.startMove(taskId);
						onClose();
					}}
				>
					Move
				</button>
			)}
			{canMoveUp && (
				<button
					type="button"
					role="menuitem"
					className="w-full text-left px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
					onClick={() => {
						graph.moveSiblingUp(taskId);
						onClose();
					}}
				>
					Move up
				</button>
			)}
			{canMoveDown && (
				<button
					type="button"
					role="menuitem"
					className="w-full text-left px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
					onClick={() => {
						graph.moveSiblingDown(taskId);
						onClose();
					}}
				>
					Move down
				</button>
			)}
			{canDissolve && (
				<button
					type="button"
					role="menuitem"
					className="w-full text-left px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
					onClick={() => {
						graph.dissolveTask(taskId);
						onClose();
					}}
				>
					Delete (keep children)
				</button>
			)}
		</div>
	);
}

export { OutlineView };
