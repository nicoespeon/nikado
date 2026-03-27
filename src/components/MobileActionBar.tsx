import { useEffect, useState } from "react";
import { findChildren, type TaskId } from "../model/graph";
import { useGraphStore } from "../store/graph-store";

const CONFIRM_TIMEOUT_MS = 3000;
const ICON_HEIGHT_PX = 24;
const ACTION_BUTTON_CLASS =
	"flex flex-col gap-1 items-center justify-center min-w-[60px] min-h-[44px] rounded-lg text-gray-700 dark:text-gray-300 active:bg-gray-200 dark:active:bg-gray-700 cursor-pointer";

export function MobileActionBar() {
	const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
	const editingNodeId = useGraphStore((s) => s.editingNodeId);
	const movingNodeId = useGraphStore((s) => s.movingNodeId);
	const cancelMove = useGraphStore((s) => s.cancelMove);

	if (!selectedNodeId || editingNodeId) return null;

	if (movingNodeId) {
		return (
			<div
				className="fixed bottom-0 left-0 right-0 bg-blue-600 text-white px-4 py-3 flex items-center justify-between"
				style={{
					paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
				}}
			>
				<span className="text-sm font-medium">Tap a task to move here</span>
				<button
					type="button"
					onClick={cancelMove}
					className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 rounded text-sm font-medium cursor-pointer"
				>
					Cancel
				</button>
			</div>
		);
	}

	return <ActionButtons selectedId={selectedNodeId} />;
}

function ActionButtons({ selectedId }: { selectedId: TaskId }) {
	const goalId = useGraphStore((s) => s.goalId);
	const isGoal = selectedId === goalId;

	return (
		<div
			className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-2 py-2 flex justify-around gap-1"
			style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
		>
			<AddSubTaskButton selectedId={selectedId} />
			{!isGoal && <AddSiblingButton selectedId={selectedId} />}
			<EditButton selectedId={selectedId} />
			<DeleteButton selectedId={selectedId} />
		</div>
	);
}

function AddSubTaskButton({ selectedId }: { selectedId: TaskId }) {
	const addSubTask = useGraphStore((s) => s.addSubTask);
	const expandNode = useGraphStore((s) => s.expandNode);
	const startEditing = useGraphStore((s) => s.startEditing);

	function handleClick() {
		expandNode(selectedId);
		const newId = addSubTask(selectedId, "");
		startEditing(newId);
	}

	return (
		<button type="button" onClick={handleClick} className={ACTION_BUTTON_CLASS}>
			<svg
				width={2 * ICON_HEIGHT_PX}
				height={ICON_HEIGHT_PX}
				viewBox="0 0 100 50"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				xmlns="http://www.w3.org/2000/svg"
			>
				{/* Existing parent */}
				<rect x="10" y="10" width="30" height="30" rx="6" />
				{/* Connector */}
				<rect x="40" y="25" width="20" height="1" />
				{/* New sub-task */}
				<rect x="60" y="10" width="30" height="30" rx="6" fill="none" />
				<rect x="68" y="25" width="14" height="1" rx="1" />
				<rect x="75" y="18" width="1" height="14" rx="1" />
			</svg>
			<span className="text-xs">Sub-task</span>
		</button>
	);
}

function AddSiblingButton({ selectedId }: { selectedId: TaskId }) {
	const addSibling = useGraphStore((s) => s.addSibling);
	const startEditing = useGraphStore((s) => s.startEditing);

	function handleClick() {
		const newId = addSibling(selectedId, "");
		if (newId) startEditing(newId);
	}

	return (
		<button type="button" onClick={handleClick} className={ACTION_BUTTON_CLASS}>
			<svg
				width={(100 / 74) * ICON_HEIGHT_PX}
				height={ICON_HEIGHT_PX}
				viewBox="0 0 100 74"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				xmlns="http://www.w3.org/2000/svg"
			>
				{/* Parent task */}
				<rect x="10" y="22" width="30" height="30" rx="6" fill="none" />
				{/* Connectors */}
				<path d="M 40 37 C 55 37, 45 19, 60 19" fill="none" />
				<path d="M 40 37 C 55 37, 45 55, 60 55" fill="none" />
				{/* Existing task				 */}
				<rect x="60" y="4" width="30" height="30" rx="6" />
				{/* New sibling */}
				<rect x="60" y="40" width="30" height="30" rx="6" fill="none" />
				<rect x="68" y="55" width="14" height="1" rx="1" />
				<rect x="75" y="48" width="1" height="14" rx="1" />
			</svg>
			<span className="text-xs">Sibling</span>
		</button>
	);
}

function EditButton({ selectedId }: { selectedId: TaskId }) {
	const editTask = useGraphStore((s) => s.editTask);

	return (
		<button
			type="button"
			onClick={() => {
				editTask(selectedId);
			}}
			className={ACTION_BUTTON_CLASS}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width={ICON_HEIGHT_PX}
				height={ICON_HEIGHT_PX}
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
			</svg>
			<span className="text-xs">Edit</span>
		</button>
	);
}

function DeleteButton({ selectedId }: { selectedId: TaskId }) {
	const graph = useGraphStore();
	const removeTask = useGraphStore((s) => s.removeTask);
	const hasChildren = findChildren(graph, selectedId).length > 0;
	const [confirming, setConfirming] = useState(false);

	useEffect(() => {
		if (!confirming) return;
		const timer = setTimeout(() => {
			setConfirming(false);
		}, CONFIRM_TIMEOUT_MS);
		return () => {
			clearTimeout(timer);
		};
	}, [confirming]);

	// Reset confirmation when selected task changes
	useEffect(() => {
		setConfirming(false);
	}, [selectedId]);

	function handleClick() {
		if (!hasChildren || confirming) {
			removeTask(selectedId);
			setConfirming(false);
			return;
		}
		setConfirming(true);
	}

	return (
		<button
			type="button"
			onClick={handleClick}
			className={
				confirming
					? "flex flex-col items-center justify-center min-w-[60px] min-h-[44px] rounded-lg text-white bg-red-500 active:bg-red-600 cursor-pointer"
					: ACTION_BUTTON_CLASS
			}
		>
			{confirming ? (
				<span className="text-xs font-medium">Confirm?</span>
			) : (
				<>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width={ICON_HEIGHT_PX}
						height={ICON_HEIGHT_PX}
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<rect width="20" height="5" x="2" y="3" rx="1" />
						<path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
						<path d="M10 12h4" />
					</svg>
					<span className="text-xs">Delete</span>
				</>
			)}
		</button>
	);
}
