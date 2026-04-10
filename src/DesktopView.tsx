import {
	Background,
	Panel,
	ReactFlow,
	useReactFlow,
	type Node,
	type NodeChange,
	type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { GITHUB_URL, PURCHASE_URL } from "./config";
import { CopyMarkdownButton } from "./components/CopyMarkdownButton";
import { ProgressRing } from "./components/ProgressIndicator";
import { exportGraphAsImage } from "./components/export-image";
import { GoalCelebration } from "./components/GoalCelebration";
import { ExportButton } from "./components/ExportButton";
import { HelpMenu } from "./components/HelpMenu";
import { LicenseModal } from "./components/LicenseModal";
import { SavedGraphsPanel } from "./components/SavedGraphsPanel";
import { TaskNode } from "./components/nodes/TaskNode";
import { ResetButton } from "./components/ResetButton";
import { ShareButton } from "./components/ShareButton";
import { ThemeToggle } from "./components/ThemeToggle";
import { RedoButton, UndoButton } from "./components/UndoRedoButtons";
import {
	FitViewButton,
	ZoomInButton,
	ZoomOutButton,
} from "./components/ZoomControls";
import { copyMarkdown } from "./hooks/use-copy-markdown";
import { copyUrl } from "./hooks/use-share";
import { cycleTheme, useTheme } from "./hooks/use-theme";
import {
	findChildren,
	findParent,
	findVisibleLayer,
	type TaskId,
} from "./model/graph";
import { resetWithConfirmation, useGraphStore } from "./store/graph-store";
import { useLicenseStore } from "./store/license-store";
import { useSavedGraphsStore } from "./store/saved-graphs-store";
import {
	toReactFlowEdges,
	toReactFlowNodes,
	type NodeSizes,
} from "./store/reactflow-bridge";

const nodeTypes: NodeTypes = { task: TaskNode };

function AutoFitView() {
	const { fitView } = useReactFlow();
	const taskCount = useGraphStore((s) => s.tasks.length);
	const collapsedCount = useGraphStore((s) => s.collapsedNodes.size);

	useEffect(() => {
		if (taskCount <= 1) return;
		void fitView({ duration: 200 });
	}, [taskCount, collapsedCount, fitView]);

	return null;
}

function DesktopView() {
	const { resolvedTheme, theme } = useTheme();
	const graph = useGraphStore();
	const [nodeSizes, setNodeSizes] = useState<NodeSizes>(new Map());
	const pendingNodeSizes = useRef<NodeSizes | null>(null);
	const editingNodeId = useGraphStore((s) => s.editingNodeId);
	const reactFlowRef = useRef<{
		zoomIn: (options?: { duration?: number }) => Promise<boolean>;
		zoomOut: (options?: { duration?: number }) => Promise<boolean>;
		fitView: (options?: {
			padding?: number;
			duration?: number;
		}) => Promise<boolean>;
	} | null>(null);
	const collapsedNodes = useGraphStore((s) => s.collapsedNodes);
	const rawNodes = toReactFlowNodes(graph, nodeSizes, collapsedNodes);
	const edges = toReactFlowEdges(graph, collapsedNodes);
	const [helpOpen, setHelpOpen] = useState(false);
	const [licenseOpen, setLicenseOpen] = useState(false);
	const [savedGraphsOpen, setSavedGraphsOpen] = useState(false);
	const licenseStatus = useLicenseStore((s) => s.license.status);
	const wrapperRef = useRef<HTMLDivElement>(null);
	const shuffleTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
	const movingNodeId = useGraphStore((s) => s.movingNodeId);
	const isEmpty = graph.goalId === null;
	const selectedNodeId = graph.selectedNodeId;

	const nodes = rawNodes.map((n) => ({
		...n,
		selected: n.id === selectedNodeId,
	}));

	const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
		const state = useGraphStore.getState();
		if (state.movingNodeId) {
			state.confirmMove(node.id as TaskId);
			return;
		}
		state.selectNode(node.id as TaskId);
	}, []);

	const onNodeDoubleClick = useCallback(
		(_event: React.MouseEvent, node: Node) => {
			useGraphStore.getState().editTask(node.id as TaskId);
		},
		[],
	);

	const onPaneClick = useCallback(() => {
		const state = useGraphStore.getState();
		if (state.movingNodeId) {
			state.cancelMove();
			return;
		}
		state.selectNode(null);
		setNodeContextMenu(null);
	}, []);

	const [nodeContextMenu, setNodeContextMenu] = useState<{
		taskId: TaskId;
		x: number;
		y: number;
	} | null>(null);

	const onNodeContextMenu = useCallback(
		(event: React.MouseEvent, node: Node) => {
			event.preventDefault();
			useGraphStore.getState().selectNode(node.id as TaskId);
			setNodeContextMenu({
				taskId: node.id as TaskId,
				x: event.clientX,
				y: event.clientY,
			});
		},
		[],
	);

	useEffect(() => {
		if (editingNodeId) return;
		if (!pendingNodeSizes.current) return;

		const flushed = pendingNodeSizes.current;
		pendingNodeSizes.current = null;
		setNodeSizes(flushed);
	}, [editingNodeId]);

	const onNodesChange = useCallback(
		(changes: NodeChange[]) => {
			const isEditing = !!useGraphStore.getState().editingNodeId;

			const update = (prev: NodeSizes) => {
				let next = prev;
				for (const change of changes) {
					if (change.type !== "dimensions" || !change.dimensions) continue;
					const existing = next.get(change.id);
					if (
						existing?.width === change.dimensions.width &&
						existing.height === change.dimensions.height
					)
						continue;
					if (next === prev) next = new Map(prev);
					next.set(change.id, change.dimensions);
				}
				return next;
			};

			if (isEditing) {
				pendingNodeSizes.current = update(
					pendingNodeSizes.current ?? new Map(nodeSizes),
				);
			} else {
				setNodeSizes(update);
			}
		},
		[nodeSizes],
	);

	useEffect(() => {
		// A pressed Space triggers edit mode on keyup (tap), but a held Space
		// is a pan gesture and should not trigger anything. We detect hold via
		// the `repeat` flag on the second keydown.
		let spaceTapPending = false;

		function handleKeyDown(e: KeyboardEvent) {
			const active = document.activeElement;
			if (
				active instanceof HTMLInputElement ||
				active instanceof HTMLTextAreaElement
			)
				return;

			if (e.key === "Escape" && nodeContextMenu) {
				e.preventDefault();
				setNodeContextMenu(null);
				return;
			}

			if (e.key === "Escape" && savedGraphsOpen) {
				e.preventDefault();
				setSavedGraphsOpen(false);
				return;
			}

			if (e.key === "Escape" && licenseOpen) {
				e.preventDefault();
				setLicenseOpen(false);
				return;
			}

			if (e.key === "Escape" && helpOpen) {
				e.preventDefault();
				setHelpOpen(false);
				return;
			}

			if (e.key === "Escape" && movingNodeId) {
				e.preventDefault();
				useGraphStore.getState().cancelMove();
				return;
			}

			if (e.key === "?") {
				e.preventDefault();
				setHelpOpen((prev) => !prev);
				return;
			}

			if (e.key === "t") {
				e.preventDefault();
				cycleTheme();
				return;
			}

			if (helpOpen) return;

			const state = useGraphStore.getState();

			if (movingNodeId) {
				if (e.key === "Enter" && selectedNodeId) {
					e.preventDefault();
					state.confirmMove(selectedNodeId);
					return;
				}

				if (e.metaKey || e.ctrlKey || e.altKey) return;

				if (e.key === "ArrowLeft" && selectedNodeId) {
					e.preventDefault();
					const parentId = findParent(state, selectedNodeId);
					if (parentId) state.selectNode(parentId);
					return;
				}

				if (e.key === "ArrowRight" && selectedNodeId) {
					e.preventDefault();
					const children = findChildren(state, selectedNodeId);
					if (children.length > 0) state.selectNode(children[0]);
					return;
				}

				if ((e.key === "ArrowUp" || e.key === "ArrowDown") && selectedNodeId) {
					e.preventDefault();
					const layer = findVisibleLayer(
						state,
						selectedNodeId,
						state.collapsedNodes,
					);
					const currentIndex = layer.indexOf(selectedNodeId);
					if (currentIndex === -1 || layer.length <= 1) return;
					const next =
						e.key === "ArrowDown"
							? layer[(currentIndex + 1) % layer.length]
							: layer[(currentIndex - 1 + layer.length) % layer.length];
					state.selectNode(next);
					return;
				}

				return;
			}

			if (e.key === "z" && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
				e.preventDefault();
				state.undo();
				return;
			}

			if (e.key === "z" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
				e.preventDefault();
				state.redo();
				return;
			}

			if (e.altKey && e.key === "ArrowUp" && selectedNodeId) {
				e.preventDefault();
				enableShuffleTransition();
				state.moveSiblingUp(selectedNodeId);
				return;
			}

			if (e.altKey && e.key === "ArrowDown" && selectedNodeId) {
				e.preventDefault();
				enableShuffleTransition();
				state.moveSiblingDown(selectedNodeId);
				return;
			}

			// Don't intercept browser shortcuts (e.g. ⌘R to reload)
			if (e.metaKey || e.ctrlKey || e.altKey) return;

			if ((e.key === "+" || e.key === "=") && reactFlowRef.current) {
				e.preventDefault();
				void reactFlowRef.current.zoomIn({ duration: 200 });
				return;
			}

			if (e.key === "-" && reactFlowRef.current) {
				e.preventDefault();
				void reactFlowRef.current.zoomOut({ duration: 200 });
				return;
			}

			if (e.key === "0" && reactFlowRef.current) {
				e.preventDefault();
				void reactFlowRef.current.fitView({ duration: 200 });
				return;
			}

			if (e.key === " ") {
				e.preventDefault();
				if (e.repeat) {
					spaceTapPending = false;
					return;
				}
				spaceTapPending = true;
				return;
			}

			if (e.key === "Tab" && e.shiftKey && selectedNodeId) {
				e.preventDefault();
				const newTaskId = state.insertParent(selectedNodeId, "");
				if (newTaskId !== selectedNodeId) state.startEditing(newTaskId);
				return;
			}

			if (e.key === "Tab" && selectedNodeId) {
				e.preventDefault();
				state.expandNode(selectedNodeId);
				const newTaskId = state.addSubTask(selectedNodeId, "");
				state.startEditing(newTaskId);
				return;
			}

			if (e.key === "Enter" && selectedNodeId) {
				e.preventDefault();
				const newTaskId = state.addSibling(selectedNodeId, "");
				if (newTaskId) state.startEditing(newTaskId);
				return;
			}

			if ((e.key === "e" || e.key === "F2") && selectedNodeId) {
				e.preventDefault();
				state.editTask(selectedNodeId);
				return;
			}

			if (e.key === "d" && selectedNodeId) {
				e.preventDefault();
				state.toggleDone(selectedNodeId);
				return;
			}

			if (e.key === "m" && selectedNodeId) {
				e.preventDefault();
				state.startMove(selectedNodeId);
				return;
			}

			if (
				(e.key === "Delete" || e.key === "Backspace") &&
				e.shiftKey &&
				selectedNodeId
			) {
				e.preventDefault();
				state.dissolveTask(selectedNodeId);
				return;
			}

			if ((e.key === "Delete" || e.key === "Backspace") && selectedNodeId) {
				e.preventDefault();
				state.removeTask(selectedNodeId);
				return;
			}

			if (e.key === "r" && state.goalId !== null) {
				e.preventDefault();
				resetWithConfirmation();
				return;
			}

			if (e.key === "s" && state.goalId !== null) {
				e.preventDefault();
				copyUrl();
				return;
			}

			if (e.key === "c" && state.goalId !== null) {
				e.preventDefault();
				copyMarkdown(state);
				return;
			}

			if (e.key === "p") {
				e.preventDefault();
				setLicenseOpen((prev) => !prev);
				return;
			}

			if (e.key === "l" && licenseStatus === "active") {
				e.preventDefault();
				setSavedGraphsOpen((prev) => !prev);
				return;
			}

			if (e.key === "n" && licenseStatus === "active") {
				e.preventDefault();
				useSavedGraphsStore.getState().newGraph();
				return;
			}

			if (e.key === "g") {
				e.preventDefault();
				window.open(GITHUB_URL, "_blank", "noopener,noreferrer");
				return;
			}

			if (e.key === "x" && state.goalId !== null && reactFlowRef.current) {
				e.preventDefault();
				const goal = state.tasks.find((t) => t.id === state.goalId);
				void exportGraphAsImage({
					fitView: reactFlowRef.current.fitView,
					goalLabel: goal?.label,
				});
				return;
			}

			if (e.key.startsWith("Arrow") && !selectedNodeId) {
				e.preventDefault();
				if (state.goalId) state.selectNode(state.goalId);
				return;
			}

			if (e.key === "h" && selectedNodeId) {
				e.preventDefault();
				state.toggleCollapse(selectedNodeId);
				return;
			}

			if (e.key === "[" && selectedNodeId) {
				e.preventDefault();
				state.collapseNode(selectedNodeId);
				return;
			}

			if (e.key === "]" && selectedNodeId) {
				e.preventDefault();
				state.expandNode(selectedNodeId);
				return;
			}

			if (e.key === "ArrowLeft" && selectedNodeId) {
				e.preventDefault();
				const parentId = findParent(state, selectedNodeId);
				if (parentId) state.selectNode(parentId);
				return;
			}

			if (e.key === "ArrowRight" && selectedNodeId) {
				e.preventDefault();
				if (state.collapsedNodes.has(selectedNodeId)) {
					state.expandNode(selectedNodeId);
					return;
				}
				const children = findChildren(state, selectedNodeId);
				if (children.length > 0) state.selectNode(children[0]);
				return;
			}

			if ((e.key === "ArrowUp" || e.key === "ArrowDown") && selectedNodeId) {
				e.preventDefault();
				const layer = findVisibleLayer(
					state,
					selectedNodeId,
					state.collapsedNodes,
				);
				const currentIndex = layer.indexOf(selectedNodeId);
				if (currentIndex === -1 || layer.length <= 1) return;

				const next =
					e.key === "ArrowDown"
						? layer[(currentIndex + 1) % layer.length]
						: layer[(currentIndex - 1 + layer.length) % layer.length];
				state.selectNode(next);
				return;
			}
		}

		function handleKeyUp(e: KeyboardEvent) {
			if (e.key !== " ") return;
			if (!spaceTapPending) return;
			spaceTapPending = false;

			const state = useGraphStore.getState();
			if (state.goalId === null) {
				state.createGoal("");
				const goalId = useGraphStore.getState().goalId;
				if (goalId) state.startEditing(goalId);
			} else {
				state.editTask(selectedNodeId ?? state.goalId);
			}
		}

		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("keyup", handleKeyUp);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("keyup", handleKeyUp);
		};
	}, [
		selectedNodeId,
		helpOpen,
		licenseOpen,
		savedGraphsOpen,
		licenseStatus,
		nodeContextMenu,
		movingNodeId,
	]);

	useEffect(() => {
		return () => {
			clearTimeout(shuffleTimerRef.current);
		};
	}, []);

	function enableShuffleTransition() {
		if (!wrapperRef.current) return;
		wrapperRef.current.classList.add("shuffling");
		clearTimeout(shuffleTimerRef.current);
		shuffleTimerRef.current = setTimeout(() => {
			wrapperRef.current?.classList.remove("shuffling");
		}, 350);
	}

	function createGoalOnDoubleClick(event: React.MouseEvent) {
		const isDoubleClick = event.detail === 2;
		if (!isDoubleClick) return;

		const state = useGraphStore.getState();
		if (state.goalId !== null) return;

		state.createGoal("");
		const goalId = useGraphStore.getState().goalId;
		if (goalId) state.startEditing(goalId);
	}

	return (
		<div
			ref={wrapperRef}
			className="relative w-full h-full bg-gray-50 dark:bg-gray-900"
			onClick={createGoalOnDoubleClick}
		>
			{isEmpty && (
				<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
					<div className="flex items-center gap-3 mb-4">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="48"
							height="48"
							viewBox="0 0 24 24"
							fill="none"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path
								d="M16 5h-3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h3"
								stroke="#0392cf"
							/>
							<path d="M8 12h4" stroke="#0392cf" />
							<rect x="16" y="2" width="6" height="6" rx="1" stroke="#0392cf" />
							<rect
								x="16"
								y="16"
								width="6"
								height="6"
								rx="1"
								stroke="#7bc043"
							/>
							<rect x="2" y="9" width="6" height="6" rx="1" stroke="#0392cf" />
						</svg>
						<h1
							className="text-5xl text-[#0392cf]"
							style={{ fontFamily: "'Patrick Hand', cursive" }}
						>
							Nika<span className="text-[#7bc043]">do</span>
						</h1>
					</div>
					<p className="text-gray-400 dark:text-gray-500 text-lg">
						Double-click or press Space to create your goal
					</p>
				</div>
			)}
			<ReactFlow
				nodes={nodes}
				edges={edges}
				nodeTypes={nodeTypes}
				onNodesChange={onNodesChange}
				onNodeClick={onNodeClick}
				onNodeDoubleClick={onNodeDoubleClick}
				onPaneClick={onPaneClick}
				onNodeContextMenu={onNodeContextMenu}
				onInit={(instance) => {
					reactFlowRef.current = instance;
					// Corrective fit after nodes finish rendering with final dimensions.
					// fitView={true} fires before w-fit nodes are fully laid out.
					setTimeout(() => void instance.fitView(), 200);
				}}
				edgesFocusable={false}
				colorMode={resolvedTheme}
				// Figma-like tool controls
				// Also, panOnDrag should be false for tests to work until https://github.com/testing-library/user-event/pull/1306 is released
				selectionOnDrag={true}
				panOnScroll={true}
				panOnDrag={false}
				fitView={true}
				proOptions={{ hideAttribution: true }}
				className="bg-white dark:bg-gray-900"
			>
				<Background
					color={resolvedTheme === "dark" ? "#374151" : "#e5e7eb"}
					gap={16}
				/>
				{licenseStatus === "active" && (
					<Panel position="top-left">
						<SavedGraphsPanel
							expanded={savedGraphsOpen}
							onToggle={() => {
								setSavedGraphsOpen((prev) => !prev);
							}}
						/>
					</Panel>
				)}
				<Panel position="top-right">
					<div className="flex gap-1">
						<UndoButton />
						<RedoButton />
						<ResetButton />
						<ExportButton />
						<CopyMarkdownButton />
						<ShareButton />
						<ProgressRing />
					</div>
				</Panel>
				<Panel position="bottom-left">
					<div className="flex gap-1">
						<ZoomInButton />
						<ZoomOutButton />
						<FitViewButton />
						<ThemeToggle theme={theme} />
					</div>
				</Panel>
				<Panel position="bottom-right">
					<div className="flex gap-1">
						<button
							type="button"
							aria-label="Nikado Pro (P)"
							title="Nikado Pro (P)"
							onClick={() => {
								setLicenseOpen(true);
							}}
							className={`flex items-center justify-center h-9 px-3 rounded-full border shadow-sm text-xs font-semibold cursor-pointer ${
								licenseStatus === "active"
									? "bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400"
									: "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
							}`}
						>
							Pro
						</button>
						<button
							type="button"
							aria-label="Help (?)"
							title="Help (?)"
							onClick={() => {
								setHelpOpen(true);
							}}
							className="flex items-center justify-center w-9 h-9 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-base font-semibold cursor-pointer"
						>
							?
						</button>
						<a
							href={GITHUB_URL}
							target="_blank"
							rel="noopener noreferrer"
							aria-label="GitHub repository (G)"
							title="GitHub repository (G)"
							className="flex items-center justify-center w-9 h-9 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="18"
								height="18"
								viewBox="0 0 24 24"
								fill="currentColor"
							>
								<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
							</svg>
						</a>
					</div>
				</Panel>
				<AutoFitView />
			</ReactFlow>
			<GoalCelebration />
			{movingNodeId && (
				<div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
					<span>Move mode: select a new parent</span>
					<button
						type="button"
						onClick={() => {
							useGraphStore.getState().cancelMove();
						}}
						className="ml-1 px-2 py-0.5 bg-blue-700 hover:bg-blue-800 rounded text-xs cursor-pointer"
					>
						Cancel (Esc)
					</button>
				</div>
			)}
			{helpOpen && (
				<HelpMenu
					onClose={() => {
						setHelpOpen(false);
					}}
				/>
			)}
			{licenseOpen && (
				<LicenseModal
					onClose={() => {
						setLicenseOpen(false);
					}}
					purchaseUrl={PURCHASE_URL}
				/>
			)}
			{nodeContextMenu && (
				<NodeContextMenu
					taskId={nodeContextMenu.taskId}
					x={nodeContextMenu.x}
					y={nodeContextMenu.y}
					onClose={() => {
						setNodeContextMenu(null);
					}}
					onShuffle={enableShuffleTransition}
				/>
			)}
		</div>
	);
}

type NodeContextMenuProps = {
	taskId: TaskId;
	x: number;
	y: number;
	onClose: () => void;
	onShuffle: () => void;
};

function NodeContextMenu({
	taskId,
	x,
	y,
	onClose,
	onShuffle,
}: NodeContextMenuProps) {
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
		function handleClickOutside(e: MouseEvent) {
			if (
				menuRef.current &&
				!menuRef.current.contains(e.target as HTMLElement)
			) {
				onClose();
			}
		}
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
		}
		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [onClose]);

	return (
		<div
			ref={menuRef}
			role="menu"
			aria-label="Task actions"
			className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg py-1 min-w-40 select-none"
			style={{ left: `${String(x)}px`, top: `${String(y)}px` }}
		>
			<button
				type="button"
				role="menuitem"
				className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
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
					className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
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
					className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
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
					className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
					onClick={() => {
						onShuffle();
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
					className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
					onClick={() => {
						onShuffle();
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
					className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
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

export { DesktopView };
