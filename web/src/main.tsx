import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Updater from './store/updater';


const container = document.querySelector('#root')
if (container) {
  const root = createRoot(container)
  const queryClient = new QueryClient()
  root.render(
    <QueryClientProvider client={queryClient}>
      <App />
      <Updater />
    </QueryClientProvider>
  )
}
