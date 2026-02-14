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
import { TaskNode } from "./components/nodes/TaskNode";
import { CopyMarkdownButton } from "./components/CopyMarkdownButton";
import { ExportButton } from "./components/ExportButton";
import { exportGraphAsImage } from "./components/export-image";
import { HelpMenu } from "./components/HelpMenu";
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
import { useUrlSync } from "./hooks/use-url-sync";
import { findChildren, findParent, type TaskId } from "./model/graph";
import { useGraphStore } from "./store/graph-store";
import {
	toReactFlowEdges,
	toReactFlowNodes,
	type NodeSizes,
} from "./store/reactflow-bridge";

const nodeTypes: NodeTypes = { task: TaskNode };

function AutoFitView() {
	const { fitView } = useReactFlow();
	const taskCount = useGraphStore((s) => s.tasks.length);

	useEffect(() => {
		if (taskCount <= 1) return;
		void fitView({ duration: 200 });
	}, [taskCount, fitView]);

	return null;
}

const MAX_TITLE_LENGTH = 50;

function useDocumentTitle() {
	const goalLabel = useGraphStore((s) => {
		if (!s.goalId) return null;
		return s.tasks.find((t) => t.id === s.goalId)?.label ?? null;
	});

	useEffect(() => {
		if (!goalLabel) {
			document.title = "Nikado";
			return;
		}

		const trimmed =
			goalLabel.length > MAX_TITLE_LENGTH
				? goalLabel.slice(0, MAX_TITLE_LENGTH) + "\u2026"
				: goalLabel;
		document.title = `${trimmed} | Nikado`;
	}, [goalLabel]);
}

function App() {
	useDocumentTitle();
	useUrlSync();
	const { resolvedTheme, theme } = useTheme();
	const graph = useGraphStore();
	const [nodeSizes, setNodeSizes] = useState<NodeSizes>(new Map());
	const reactFlowRef = useRef<{
		zoomIn: (options?: { duration?: number }) => Promise<boolean>;
		zoomOut: (options?: { duration?: number }) => Promise<boolean>;
		fitView: (options?: {
			padding?: number;
			duration?: number;
		}) => Promise<boolean>;
	} | null>(null);
	const rawNodes = toReactFlowNodes(graph, nodeSizes);
	const edges = toReactFlowEdges(graph);
	const [helpOpen, setHelpOpen] = useState(false);
	const isEmpty = graph.goalId === null;
	const selectedNodeId = graph.selectedNodeId;

	const nodes = rawNodes.map((n) => ({
		...n,
		selected: n.id === selectedNodeId,
	}));

	const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
		useGraphStore.getState().selectNode(node.id as TaskId);
	}, []);

	const onPaneClick = useCallback(() => {
		useGraphStore.getState().selectNode(null);
	}, []);

	const onNodesChange = useCallback((changes: NodeChange[]) => {
		// Skip layout recomputation during editing to avoid focus loss
		if (useGraphStore.getState().editingNodeId) return;

		setNodeSizes((prev) => {
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
		});
	}, []);

	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			const active = document.activeElement;
			if (
				active instanceof HTMLInputElement ||
				active instanceof HTMLTextAreaElement
			)
				return;

			if (e.key === "Escape" && helpOpen) {
				e.preventDefault();
				setHelpOpen(false);
				return;
			}

			const state = useGraphStore.getState();

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
				if (state.goalId === null) {
					state.createGoal("");
					const goalId = useGraphStore.getState().goalId;
					if (goalId) state.startEditing(goalId);
				} else {
					state.editTask(state.goalId);
				}
				return;
			}

			if (e.key === "Tab" && selectedNodeId) {
				e.preventDefault();
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

			if ((e.key === "Delete" || e.key === "Backspace") && selectedNodeId) {
				e.preventDefault();
				state.removeTask(selectedNodeId);
				return;
			}

			if (e.key === "t") {
				e.preventDefault();
				cycleTheme();
				return;
			}

			if (e.key === "r" && state.goalId !== null) {
				e.preventDefault();
				state.reset();
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

			if (e.key === "x" && state.goalId !== null && reactFlowRef.current) {
				e.preventDefault();
				const goal = state.tasks.find((t) => t.id === state.goalId);
				void exportGraphAsImage({
					fitView: reactFlowRef.current.fitView,
					goalLabel: goal?.label,
				});
				return;
			}

			if (e.key === "?") {
				e.preventDefault();
				setHelpOpen((prev) => !prev);
				return;
			}

			if (e.key.startsWith("Arrow") && !selectedNodeId) {
				e.preventDefault();
				if (state.goalId) state.selectNode(state.goalId);
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
				const children = findChildren(state, selectedNodeId);
				if (children.length > 0) state.selectNode(children[0]);
				return;
			}

			if ((e.key === "ArrowUp" || e.key === "ArrowDown") && selectedNodeId) {
				e.preventDefault();
				const parentId = findParent(state, selectedNodeId);
				if (!parentId) return;

				const allSiblings = findChildren(state, parentId);
				const currentIndex = allSiblings.indexOf(selectedNodeId);
				if (currentIndex === -1 || allSiblings.length <= 1) return;

				const next =
					e.key === "ArrowDown"
						? allSiblings[(currentIndex + 1) % allSiblings.length]
						: allSiblings[
								(currentIndex - 1 + allSiblings.length) % allSiblings.length
							];
				state.selectNode(next);
				return;
			}
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [selectedNodeId, helpOpen]);

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
				onPaneClick={onPaneClick}
				onInit={(instance) => {
					reactFlowRef.current = instance;
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
				<Panel position="top-right">
					<div className="flex gap-1">
						<UndoButton />
						<RedoButton />
						<ResetButton />
						<ExportButton />
						<CopyMarkdownButton />
						<ShareButton />
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
				</Panel>
				<AutoFitView />
			</ReactFlow>
			{helpOpen && (
				<HelpMenu
					onClose={() => {
						setHelpOpen(false);
					}}
				/>
			)}
		</div>
	);
}

export { App };
