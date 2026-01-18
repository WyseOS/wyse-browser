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
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import { Typography } from "@mui/material";
import { DatabaseSchemaNode } from "@/components/database-schema-node";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import useStore from "@/store/global";
import { isArray, isObject, isEmpty } from "lodash";
import { v4 as uuidv4 } from "uuid";
import Button from "@mui/material/Button";

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
      <Box className="update-node__controls absolute left-0 top-4 z-[9999] w-full flex justify-center pointer-events-none">
        <div className="sketchy-card px-4 py-2 flex items-center space-x-4 pointer-events-auto bg-[#fdfbf7]">
          <Select
            value={activeFlow}
            onChange={handleChangeFlow}
            variant="outlined"
            size="small"
            sx={{
              width: 280,
              ".MuiOutlinedInput-notchedOutline": { border: "none" },
              backgroundColor: "white",
              borderRadius: "255px 15px 225px 15px / 15px 225px 15px 255px",
              border: "2px solid #374151",
              color: "#374151",
            }}
          >
            {flowsData.map((item: any, index: number) => {
              return (
                <MenuItem id={`${item}${index}`} value={index} key={index}>
                  {item.name}
                </MenuItem>
              );
            })}
          </Select>
          <Button
            onClick={handleSave}
            variant="contained"
            color="primary"
            sx={{ borderRadius: "255px 15px 225px 15px / 15px 225px 15px 255px", px: 3 }}
          >
            Save Flow
          </Button>
        </div>
      </Box>
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
    <Box
      sx={{ width: "100%", height: "100%" }}
      className="relative flex p-4 gap-4"
    >
      <Paper
        className="basis-[280px] p-0 flex flex-col overflow-hidden sketchy-card border-2 border-[#374151]"
        elevation={0}
        sx={{ backgroundColor: "#fdfbf7" }}
      >
        <div className="p-6 border-b-2 border-[#374151] bg-[#f3f4f6]">
          <Typography variant="h6" className="font-bold text-[#374151]" style={{ fontFamily: '"Patrick Hand"' }}>
            Worklets
          </Typography>
          <Typography variant="caption" className="text-slate-500" style={{ fontFamily: '"Patrick Hand"' }}>
            Drag items to the canvas
          </Typography>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {worklets.map((item, index) => {
            return (
              <div
                key={item.name}
                className="cursor-grab active:cursor-grabbing p-3 rounded-lg bg-white hover:bg-yellow-50 border-2 border-[#374151] shadow-[2px_2px_0_#374151] transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#374151] flex items-center group"
                draggable={true}
                onDragStart={(e) => console.log("onDragStart")}
                onDragEnd={(e) => handleDragItem(e, item)}
                id={`item${index}`}
              >
                <div className="w-3 h-3 rounded-full border border-[#374151] bg-blue-400 mr-3"></div>
                <span className="text-lg font-medium text-[#374151]" style={{ fontFamily: '"Patrick Hand"' }}>
                  {item.name}
                </span>
              </div>
            );
          })}
        </div>
      </Paper>
      <Box className="flex-1 relative rounded-[15px] overflow-hidden border-2 border-[#374151] bg-white shadow-[4px_4px_0_#374151]">
        {isEmpty(refactorData) ? (
          <div className="flex items-center justify-center h-full text-slate-500">
            No flows available
          </div>
        ) : (
          <Flow
            flowsData={refactorData}
            addNodes={addWorklets}
            onSave={handleSave}
          />
        )}
      </Box>
    </Box>
  );
}
