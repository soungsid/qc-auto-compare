import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { ListingPage } from './pages/ListingPage'
import { DealersPage } from './pages/DealersListPage'
import { LegalPage } from './pages/LegalPage'
import './styles.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

// Simple client-side router
function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname)

  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Route rendering
  if (currentPath === '/dealers') {
    return <DealersPage />
  }
  if (currentPath === '/legal') {
    return <LegalPage />
  }
  return <ListingPage />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)
