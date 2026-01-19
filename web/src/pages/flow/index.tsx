import { useCallback, useEffect, useState, useMemo } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { DatabaseSchemaNode } from "@/components/database-schema-node";

import useStore from "@/store/global";
import { isArray, isObject, isEmpty } from "lodash";
import { v4 as uuidv4 } from "uuid";


const nodeTypes = {
  databaseSchema: DatabaseSchemaNode,
};

function Flow(props: any) {
  const { flowsData, addNodes, onSave } = props;
  //[refactorTokenSwap, refactorFlowStart, refactorWalletConnect, refactorWalletTransfer, refactorTwitterConnection, ...refactorConnection, refactorFlowEnd]
  const [nodes, setNodes, onNodesChange] = useNodesState(addNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const onConnect = useCallback(
    (params: any) => setEdges((eds: Edge[]) => addEdge(params, eds)),
    [setEdges]
  );

  console.log("edges", edges);

  useEffect(() => {
    if (isEmpty(addNodes)) {
      return;
    }
    setNodes(addNodes);
  }, [addNodes]);

  /* const [activeNode, setActiveNode] = useState("1");
  const currentActiveNode = useMemo(() => {
    const node = refactorNodes.find(item => item.id === activeNode)
    return node
  },[refactorNodes])
  const [nodeName, setNodeName] = useState(currentActiveNode.data.label);


  const handleClick = (e) => {
    console.log(e.target);
    setActiveNode(e.target?.dataset?.id.toString())
    const node = refactorNodes.find(item => item.id === e.target?.dataset?.id.toString())
    setNodeName(node?.data?.label)
  } */

  /* useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === activeNode) {
          // it's important that you create a new node object
          // in order to notify react flow about the change
          return {
            ...node,
            data: {
              ...node.data,
              label: nodeName,
            },
          };
        }
 
        return node;
      }),
    );
  }, [nodeName, setNodes, activeNode]); */

  const [activeFlow, setActiveFlow] = useState(0);

  const handleChangeFlow = (e: any) => {
    const currentFlow = flowsData[e.target.value];
    console.log("currentFlow", currentFlow);
    setActiveFlow(e.target.value);
    setNodes(currentFlow.actions);
    setEdges(currentFlow.edges);
  };

  const handleSave = () => {
    onSave(nodes, edges);
  };

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      //onClick={handleClick}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      fitView
      attributionPosition="bottom-left"
    >
      <div className="absolute left-6 top-6 z-10 flex items-center space-x-3 bg-white/90 backdrop-blur p-2 rounded-lg shadow-sm border border-border">
        <select
          value={activeFlow}
          onChange={handleChangeFlow}
          className="select-clean"
          style={{ width: 240 }}
        >
          {flowsData.map((item: any, index: number) => {
            return (
              <option id={`${item}${index}`} value={index} key={index}>
                {item.name}
              </option>
            );
          })}
        </select>
        <button
          onClick={handleSave}
          className="btn-primary"
        >
          Save Flow
        </button>
      </div>
      <MiniMap bgColor="#FFF" />
      <Controls />
      <Background />
    </ReactFlow>
  );
}

export default function App() {
  const { flows, worklets } = useStore();
  const refactorData = flows.map((flow: any, flowIndex: number) => {
    const actions = flow.nodes.map((flowNode: any, flowNodeIndex: number) => {
      const nodeWorklets: any = worklets.find(
        (item) => item.name === flowNode.name
      );
      const nodeActions = nodeWorklets?.actions || [];
      const actions = isArray(nodeActions)
        ? nodeActions
        : Object.entries(nodeActions).map((item: any) => ({
          ...item[1],
          name: item[0],
        }));
      return {
        id: `${flowNode.name}-${flowIndex}-${flowNodeIndex}`,
        position: { x: flowNodeIndex * 400, y: 0 },
        type: "databaseSchema",
        data: {
          label: flowNode.name,
          schema: actions.map((item: any, itemIndex: number) => ({
            title: `action ${itemIndex + 1}`,
            type: item.name,
          })),
        },
      };
    });

    const refactorEdges =
      flow.connections?.map((connection: any, connectionIndex: number) => {
        const findSourceItem = actions.find((action: any) =>
          action.data.schema.some(
            (item: any) => item.type === connection.src.action
          )
        );
        const findToItem = actions.find((action: any) =>
          action.data.schema.some(
            (item: any) => item.type === connection.dest[0].action
          )
        );
        const targetActionItem = findToItem.data.schema.find(
          (item: any) => item.type === connection.dest[0].action
        );
        const sourceId = findSourceItem.id;
        const sourceHandle = connection.src.action;
        const targetId = findToItem.id;
        const targetHandle = targetActionItem.title;
        return {
          id: `${sourceHandle}-${targetHandle}-${flowIndex}`,
          source: sourceId,
          target: targetId,
          sourceHandle: sourceHandle,
          targetHandle: targetHandle,
        };
      }) || [];

    return {
      name: flow.name,
      actions: actions,
      edges: refactorEdges,
    };
  });

  const [addWorklets, setAddWorklets] = useState<any[]>([]);

  const handleDragItem = (e: any, worklet: any) => {
    const actions = isArray(worklet.actions)
      ? worklet.actions
      : Object.entries(worklet.actions).map((item: any) => ({
        ...item[1],
        name: item[0],
      }));
    setAddWorklets((state) => {
      return state.concat({
        id: `${worklet.name}-${uuidv4()}`.toString(),
        position: { x: e?.clientX, y: e?.clientY },
        type: "databaseSchema",
        data: {
          label: worklet.name,
          schema: actions.map((item: any, itemIndex: number) => ({
            title: `action ${itemIndex + 1}`,
            type: item.name,
          })),
        },
      });
    });
  };

  useEffect(() => {
    const item1 = document.getElementById("item1");
    console.log(item1?.ATTRIBUTE_NODE);
  }, []);

  const handleSave = (params: any) => {
    console.log("save", params);
  };

  return (
    <div className="relative flex h-full w-full gap-4 p-4">
      {/* Sidebar - Worklets */}
      <div className="flex w-[280px] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-muted/40 p-4">
          <h2 className="text-lg font-semibold text-foreground">
            Worklets
          </h2>
          <p className="text-sm text-muted-foreground">
            Drag items to the canvas
          </p>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {worklets.map((item, index) => {
            return (
              <div
                key={item.name}
                className="group flex cursor-grab items-center rounded-lg border border-border bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md active:cursor-grabbing"
                draggable={true}
                onDragStart={(e) => console.log("onDragStart")}
                onDragEnd={(e) => handleDragItem(e, item)}
                id={`item${index}`}
              >
                <div className="mr-3 h-3 w-3 rounded-full bg-blue-400 ring-2 ring-blue-100"></div>
                <span className="font-medium text-foreground">
                  {item.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="relative flex-1 overflow-hidden rounded-xl border border-border bg-white shadow-sm ring-1 ring-black/5">
        {isEmpty(refactorData) ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            No flows available
          </div>
        ) : (
          <Flow
            flowsData={refactorData}
            addNodes={addWorklets}
            onSave={handleSave}
          />
        )}
      </div>
    </div>
  );
}
