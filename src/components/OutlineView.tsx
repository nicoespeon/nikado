import { taskDepth, walkTree } from "../model/graph";
import { useGraphStore } from "../store/graph-store";
import { OutlineRow } from "./OutlineRow";

function OutlineView() {
	const graph = useGraphStore();
	const collapsedNodes = useGraphStore((s) => s.collapsedNodes);
	const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
	const orderedTasks = walkTree(graph, graph.goalId, collapsedNodes);

	return (
		<div role="tree" aria-label="Mikado graph">
			{orderedTasks.map((taskId) => (
				<OutlineRow
					key={taskId}
					taskId={taskId}
					depth={taskDepth(graph, taskId)}
					isGoal={taskId === graph.goalId}
					isSelected={taskId === selectedNodeId}
				/>
			))}
		</div>
	);
}

export { OutlineView };
