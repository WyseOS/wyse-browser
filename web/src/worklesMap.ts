import workletTwitter from './worklets/Twitter/manifest.json';
import workletFlowstart from './worklets/flow_start/manifest.json';
import workletFlowend from './worklets/flow_end/manifest.json';
import workletWalletConnect from './worklets/wallet_connect/manifest.json'
import workletWalletTransfer from './worklets/wallet_transfer/manifest.json'
import workletTokenSwap from './worklets/token_swap/manifest.json'


const refactorTokenSwap = {
  id: 'TokenSwap',
  position: { x: 0, y: 600 },
  type: "databaseSchema",
  data: {
    label: 'TokenSwap',
    schema: Object.entries(workletTokenSwap?.actions).map((item, actionIndex) => ({title: `action ${actionIndex}`, type: item[0]}))
  },
}
const refactorFlowStart = {
  id: 'FlowStart',
  position: { x: 0, y: 0 },
  type: "databaseSchema",
  data: {
    label: 'FlowStart',
    schema: workletFlowstart.actions.map((item, actionIndex) => ({title: `action ${actionIndex}`, type: item.name})),
  },
}

const refactorFlowEnd = {
  id: 'FlowEnd',
  position: { x: 600, y: 0 },
  type: "databaseSchema",
  data: {
    label: 'FlowEnd',
    schema: workletFlowend.actions.map((item, actionIndex) => ({title: `action ${actionIndex}`, type: item.name})),
  },
}

const refactorTwitterConnection = {
  id: 'Twitter',
  type: "databaseSchema",
  position: { x: 300, y: 0 },
  data: {
    label: 'Twitter',
    schema: workletTwitter.actions.map((item, actionIndex) => ({title: `action ${actionIndex}`, type: item.name})),
  },
}


const refactorWalletConnect = {
  id: 'WalletConnect',
  type: "databaseSchema",
  position: { x: 0, y: 300 },
  data: {
    label: 'WalletConnect',
    schema: workletWalletConnect.actions.map((item, actionIndex) => ({title: `action ${actionIndex}`, type: item.name})),
  },
}

console.log('wallet transfer', workletWalletTransfer, workletWalletTransfer?.actions)
const refactorWalletTransfer = {
  id: 'WalletTransfer',
  type: "databaseSchema",
  position: { x: 600, y: 300 },
  data: {
    label: 'WalletTransfer',
    schema: Object.entries(workletWalletTransfer?.actions).map((item, actionIndex) => ({title: `action ${actionIndex}`, type: item[0]}))
    //schema: workletWalletTransfer?.actions?.map((item, actionIndex) => ({title: `action ${actionIndex}`, type: item.name})),
  },
}

export const WorkletMap = [
  {
    name: 'token swap',
    value: 'TokenSwap',
    data: refactorTokenSwap
  },
  {
    name: 'wallet transfer',
    value: 'WalletTransfer',
    data: refactorWalletTransfer
  },
  {
    name: 'wallet connect',
    value: 'WalletConnect',
    data: refactorWalletConnect
  },
  {
    name: 'flow start',
    value: 'FlowStart',
    data: refactorFlowStart
  },
  {
    name: 'flow end',
    value: 'FlowEnd',
    data: refactorFlowEnd
  },
  {
    name: 'Twitter',
    value: 'Twitter',
    data: refactorTwitterConnection
  },

]


export default {
  WorkletMap
}