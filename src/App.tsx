import { useCallback, useState } from "react";
import ReactFlow, {
	addEdge,
	Background,
	Connection,
	Controls,
	Node,
	useEdgesState,
	useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";

function App() {
	const [nodes, setNodes, onNodesChange] = useNodesState([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState([]);
	const [nodeId, setNodeId] = useState(0);

	const createEdge = useCallback(
		(params: Connection) => {
			setEdges((edges) => addEdge(params, edges));
		},
		[setEdges],
	);

	const createNodeOnDoubleClick = useCallback(
		(event: React.MouseEvent) => {
			const isDoubleClick = event.detail === 2;
			if (!isDoubleClick) return;

			const reactFlowBounds = event.currentTarget.getBoundingClientRect();
			const position = {
				x: event.clientX - reactFlowBounds.left,
				y: event.clientY - reactFlowBounds.top,
			};

			const newNode: Node = {
				id: `node-${String(nodeId)}`,
				type: "default",
				position,
				data: { label: "New Node" },
			};

			setNodes((nodes) => nodes.concat(newNode));
			setNodeId((id) => id + 1);
		},
		[nodeId, setNodes],
	);

	return (
		<div className="w-full h-full bg-gray-50">
			<ReactFlow
				nodes={nodes}
				edges={edges}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				onConnect={createEdge}
				onPaneClick={createNodeOnDoubleClick}
				// Figma-like tool controls
				// Also, panOnDrag should be false for tests to work until https://github.com/testing-library/user-event/pull/1306 is released
				selectionOnDrag={true}
				panOnScroll={true}
				panOnDrag={false}
				// Style
				fitView={true}
				className="bg-white"
			>
				<Background color="#e5e7eb" gap={16} />
				<Controls />
			</ReactFlow>
		</div>
	);
}

export { App };
