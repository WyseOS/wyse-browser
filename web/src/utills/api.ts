
export function getApi(query:string){
  return `${import.meta.env.VITE_BACKEND_URL}${query}`
}