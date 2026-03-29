import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { ListingPage } from './pages/ListingPage'
import { DealersPage } from './pages/DealersListPage'
import { LegalPage } from './pages/LegalPage'
import { AboutPage } from './pages/AboutPage'
import { ContactPage } from './pages/ContactPage'
import { BlogPage } from './pages/BlogPage'
import { CrawlHistoryPage } from './pages/CrawlHistoryPage'
import { GTM } from './components/GTM'
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
  if (currentPath === '/about') {
    return <AboutPage />
  }
  if (currentPath === '/contact') {
    return <ContactPage />
  }
  if (currentPath === '/blog') {
    return <BlogPage />
  }
  if (currentPath === '/crawl-history') {
    return <CrawlHistoryPage />
  }
  return <ListingPage />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <GTM />
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)
