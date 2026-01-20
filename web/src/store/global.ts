// store.js
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface FlowProps {
  name: string;
}

interface WorkletProps {
  name: string;
}

interface AppState {
  flows: FlowProps[];
  setFlows: (value: FlowProps[]) => void;
  worklets: FlowProps[];
  setWorklets: (value: WorkletProps[]) => void;
  proxyList: any[];
  setProxyList: (value: any[]) => void;
  profileList: any[];
  setProfileList: (value: any[]) => void;
}

const useStore = create<AppState>()(
  persist(
    (set) => ({
      flows: [],
      setFlows: (value: FlowProps[]) => set({ flows: value }),
      worklets: [],
      setWorklets: (value: FlowProps[]) => set({ worklets: value }),
      proxyList: [],
      setProxyList: (value: any[]) => set({ proxyList: value }),
      profileList: [],
      setProfileList: (value: any[]) => set({ profileList: value }),
    }),
    {
      name: "global",
    }
  )
);

export default useStore;
