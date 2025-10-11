// store.js
import { create } from "zustand";
import { persist } from "zustand/middleware";
import store from "store2";

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
}

const useStore = create<AppState>()(
  persist(
    (set) => ({
      flows: [],
      setFlows: (value: FlowProps[]) =>
        set((state: AppState) => {
          return {
            flows: value,
          };
        }),
      worklets: [],
      setWorklets: (value: FlowProps[]) =>
        set((state: AppState) => {
          return {
            worklets: value,
          };
        }),
      proxyList: [],
      setProxyList: (value: any[]) =>
        set((state: AppState) => {
          return {
            proxyList: value,
          };
        }),
    }),
    {
      name: "global",
    }
  )
);

export default useStore;
