import { useState, useEffect, useCallback } from 'react'
import { siteName } from '../config'
import { ThemeToggle } from './ThemeToggle'

interface NavbarProps {
  stats?: {
    active_vehicles: number
    total_dealers: number
    last_updated_at?: string
  }
}

const navLinks = [
  { href: '/', label: 'Véhicules' },
  { href: '/dealers', label: 'Concessionnaires' },
  { href: '/crawl-history', label: 'Historique crawl' },
  { href: '/about', label: 'À propos' },
  { href: '/contact', label: 'Contact' },
]

function formatRelativeTime(dateString: string): string {
  const now = Date.now()
  const then = new Date(dateString).getTime()
  const diffMs = now - then

  if (isNaN(then)) return ''

  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return "il y a quelques secondes"
  if (minutes < 60) return `il y a ${minutes} min`
  if (hours < 24) return `il y a ${hours}h`
  if (days === 1) return 'il y a 1 jour'
  return `il y a ${days} jours`
}

function isActive(href: string): boolean {
  const pathname = window.location.pathname
  if (href === '/') return pathname === '/'
  return pathname.startsWith(href)
}

export function Navbar({ stats }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const closeMobile = useCallback(() => setMobileOpen(false), [])

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  // Close on Escape key
  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeMobile() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileOpen, closeMobile])

  return (
    <>
      <header className="navbar-blur sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between py-3">
            {/* Left: Logo + Site name */}
            <a href="/" className="flex items-center gap-2 shrink-0">
              <svg
                className="w-7 h-7 text-blue-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 17h14M5 17a2 2 0 0 1-2-2V9a1 1 0 0 1 1-1h1.6a1 1 0 0 0 .8-.4l1.2-1.6a1 1 0 0 1 .8-.4h5.2a1 1 0 0 1 .8.4l1.2 1.6a1 1 0 0 0 .8.4H18a1 1 0 0 1 1 1v6a2 2 0 0 1-2 2" />
                <circle cx="7.5" cy="17" r="2" />
                <circle cx="16.5" cy="17" r="2" />
              </svg>
              <span className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                {siteName}
              </span>
            </a>

            {/* Center: Desktop navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => {
                const active = isActive(link.href)
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    className={`relative px-3 py-1.5 text-sm rounded-md transition-colors ${
                      active
                        ? 'text-zinc-900 dark:text-zinc-100 font-semibold'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    {link.label}
                    {active && (
                      <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-blue-600 rounded-full" />
                    )}
                  </a>
                )
              })}
            </nav>

            {/* Right: Stats + ThemeToggle + Hamburger */}
            <div className="flex items-center gap-3">
              {/* Stats (hidden on small screens) */}
              {stats && (
                <div className="hidden xl:flex flex-col items-end text-right">
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">
                    {stats.active_vehicles.toLocaleString('fr-CA')}{' '}
                    véhicules · {stats.total_dealers.toLocaleString('fr-CA')}{' '}
                    concessionnaires
                  </span>
                  {stats.last_updated_at && (
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                      Mis à jour {formatRelativeTime(stats.last_updated_at)}
                    </span>
                  )}
                </div>
              )}

              <ThemeToggle />

              {/* Hamburger button (mobile/tablet only) */}
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="lg:hidden p-1.5 -mr-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                aria-label="Ouvrir le menu"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 transition-opacity lg:hidden"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-72 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 transition-transform duration-300 ease-in-out lg:hidden ${
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Menu
          </span>
          <button
            type="button"
            onClick={closeMobile}
            className="p-1.5 -mr-1.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            aria-label="Fermer le menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drawer links */}
        <nav className="flex flex-col py-2">
          {navLinks.map((link) => {
            const active = isActive(link.href)
            return (
              <a
                key={link.href}
                href={link.href}
                onClick={closeMobile}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  active
                    ? 'text-zinc-900 dark:text-zinc-100 font-semibold bg-zinc-50 dark:bg-zinc-800/60'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                }`}
              >
                {active && (
                  <span className="w-1 h-1 rounded-full bg-blue-600 shrink-0" />
                )}
                {link.label}
              </a>
            )
          })}
        </nav>

        {/* Drawer stats */}
        {stats && (
          <div className="mt-auto px-4 py-4 border-t border-zinc-200 dark:border-zinc-800">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {stats.active_vehicles.toLocaleString('fr-CA')} véhicules
              <br />
              {stats.total_dealers.toLocaleString('fr-CA')} concessionnaires
            </p>
            {stats.last_updated_at && (
              <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
                Mis à jour {formatRelativeTime(stats.last_updated_at)}
              </p>
            )}
          </div>
        )}
      </div>
    </>
  )
}
