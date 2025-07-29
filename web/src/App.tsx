import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  NodeType,
  Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import OutlinedInput from '@mui/material/OutlinedInput'
import { Typography } from '@mui/material';
import { DatabaseSchemaNode } from "@/components/database-schema-node";
import Select from '@mui/material/Select';
import {WorkletMap} from './worklesMap';
import MenuItem from '@mui/material/MenuItem';
import useStore from './store/global'
import {isArray, isObject, isEmpty} from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import Button from '@mui/material/Button';

 

const nodeTypes = {
  databaseSchema: DatabaseSchemaNode,
};

function Flow(props:any) {
  const {flowsData, addNodes, onSave} = props
  //[refactorTokenSwap, refactorFlowStart, refactorWalletConnect, refactorWalletTransfer, refactorTwitterConnection, ...refactorConnection, refactorFlowEnd]
  const [nodes, setNodes, onNodesChange] = useNodesState(addNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  console.log('edges', edges)

  useEffect(() => {
    if(isEmpty(addNodes)){
      return 
    }
    setNodes(addNodes)
  },[addNodes])


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

  const [activeFlow, setActiveFlow] = useState(0)

  const handleChangeFlow = (e) => {
    const currentFlow = flowsData[e.target.value];
    console.log('currentFlow', currentFlow);
    setActiveFlow(e.target.value)
    setNodes(currentFlow.actions)
    setEdges(currentFlow.edges)
  }

  const handleSave = () => {
    onSave(nodes, edges)
  }

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
      <Box className="update-node__controls absolute left-0 top-4 z-[9999] w-full flex justify-between px-4">
        <Select 
          sx={{width: 400}} 
          value={activeFlow}
          onChange={handleChangeFlow}
        >
          {flowsData.map((item:any, index:number) => {
            return (
              <MenuItem id={`${item}${index}`} value={index} key={index}>{item.name}</MenuItem>
            )
          })}
        </Select>
        <Box>
          <Button onClick={handleSave} color='primary' variant="contained">Save</Button>
        </Box>
       {/*  <Box>
          <Typography>Node name</Typography>
          <OutlinedInput value={''} onChange={(e) => setNodeName(e.target.value)}/>
        </Box> */}
      </Box>
      <MiniMap 
        bgColor="#FFF"
      />
      <Controls />
      <Background />
    </ReactFlow>
  );
}

export default function App(){
  const {flows, worklets} = useStore()
  const refactorData = flows.map((flow, flowIndex:number) => {
    const actions = flow.nodes.map((flowNode, flowNodeIndex) => {
      const nodeWorklets = worklets.find(item => item.name === flowNode.name);
      const actions = isArray(nodeWorklets.actions) ? nodeWorklets.actions : Object.entries(nodeWorklets.actions).map(item => ({...item[1], name: item[0]}))
      return {
        id: `${flowNode.name}-${flowIndex}-${flowNodeIndex}`,
        position: { x: flowNodeIndex*400, y: 0 },
        type: "databaseSchema",
        data: {
          label: flowNode.name,
          schema: actions.map((item, itemIndex) => ({title: `action ${itemIndex+1}`, type: item.name})),
        },
      }
    })

    const refactorEdges = flow.connections?.map((connection, connectionIndex) => {
      const findSourceItem = actions.find(action => action.data.schema.some(item => item.type === connection.src.action))
      const findToItem = actions.find(action => action.data.schema.some(item => item.type === connection.dest[0].action))
      const targetActionItem = findToItem.data.schema.find(item => item.type === connection.dest[0].action)
      const sourceId = findSourceItem.id;
      const sourceHandle = connection.src.action
      const targetId = findToItem.id;
      const targetHandle = targetActionItem.title
      return {
        id: `${sourceHandle}-${targetHandle}-${flowIndex}`,
        source: sourceId,
        target: targetId,
        sourceHandle: sourceHandle,
        targetHandle: targetHandle,
      }
    }) || []

    return {
      name: flow.name,
      actions: actions,
      edges: refactorEdges
    }
  })

  const [addWorklets, setAddWorklets] = useState([])

  const handleDragItem = (e:any, worklet:any) => {
    const actions = isArray(worklet.actions) ? worklet.actions : Object.entries(worklet.actions).map(item => ({...item[1], name: item[0]}))
    setAddWorklets(state => {
      return state.concat({
          id: `${worklet.name}-${uuidv4()}`.toString(),
          position: { x: e?.clientX, y: e?.clientY },
          type: "databaseSchema",
          data: {
            label: worklet.name,
            schema: actions.map((item, itemIndex) => ({title: `action ${itemIndex+1}`, type: item.name})),
          },
      })
    })
  }

  useEffect(() => {
    const item1 = document.getElementById('item1')
    console.log(item1?.ATTRIBUTE_NODE)
  },[])

  const handleSave = (params:any) => {
    console.log('save', params)
  }
  
  return (
    <Box 
      sx={{width: '100vw', height: '100vh'}}
      className="relative flex space-x-2"
    >
      <Paper className="basis-[260px] p-4 space-y-6">
        <Typography variant="h5">Worklets</Typography>
        {worklets.map((item, index) => {
          return (
            <div 
              key={item.name} 
              className="cursor-pointer"
              draggable={true}
              onDragStart={e => console.log('onDragStart')}
              onDragEnd={(e) => handleDragItem(e, item)}
              id={`item${index}`}
          >{item.name}</div>
          )
        })}
      </Paper>
      <Box className="flex-1 relaitve">
        {isEmpty(refactorData) ? null : (
          <Flow 
            flowsData={refactorData} 
            addNodes={addWorklets}
            onSave={handleSave}
          />
        )}
      </Box>
    </Box>
  )
};