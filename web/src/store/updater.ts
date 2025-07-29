import {useCallback, useEffect} from 'react';
import useStore from './global';



export default function Updater(){
  const {setFlows, setWorklets} = useStore()
  const fetchFlows = useCallback(async() => {
    const result = await fetch(`/api/metadata/list/flow`, {headers: {"Access-Control-Allow-Origin": '*'}})
    const data = await result.json();
    if(data.code === 0){
      setFlows(data.data.data)
    }
  },[])
  const fetchWorketlets = useCallback(async() => {
    const result = await fetch(`/api/metadata/list/worklet`, {headers: {"Access-Control-Allow-Origin": '*'}})
    const data = await result.json();
    if(data.code === 0){
      setWorklets(data.data.data)
    }
  },[])

  useEffect(() => {
    fetchFlows();
    fetchWorketlets()
  },[])

  return null;
}