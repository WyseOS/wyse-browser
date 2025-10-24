import { useCallback, useEffect } from "react";
import useStore from "./global";

export default function Updater() {
  const { setFlows, setWorklets, setProxyList, setProfileList } = useStore();
  const fetchFlows = useCallback(async () => {
    const result = await fetch(`/api/metadata/list/flow`, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
    const data = await result.json();
    if (data.code === 0) {
      setFlows(data.data.data);
    }
  }, []);
  const fetchWorketlets = useCallback(async () => {
    const result = await fetch(`/api/metadata/list/worklet`, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
    const data = await result.json();
    if (data.code === 0) {
      setWorklets(data.data.data);
    }
  }, []);
  const fetchProxyList = useCallback(async () => {
    const result = await fetch(`/api/proxy/list`, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
    const data = await result.json();
    if (data.code === 0) {
      setProxyList(data.data.data);
    }
  }, []);
  const fetchProfileList = useCallback(async () => {
    const result = await fetch(`/api/profile/list`, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
    const data = await result.json();
    console.log("data proxy", data);
    if (data.code === 0) {
      setProfileList(data.data.data);
    }
  }, []);

  useEffect(() => {
    fetchFlows();
    fetchWorketlets();
    fetchProxyList();
    fetchProfileList();
  }, []);

  return null;
}
