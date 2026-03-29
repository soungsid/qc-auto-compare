import { useState, useEffect, useCallback } from 'react'
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
  { href: '/about', label: 'À propos' },
  { href: '/contact', label: 'Contact' },
]

function isActive(href: string): boolean {
  const pathname = window.location.pathname
  if (href === '/') return pathname === '/'
  return pathname.startsWith(href)
}

export function Navbar({ stats }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const closeMobile = useCallback(() => setMobileOpen(false), [])

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeMobile() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileOpen, closeMobile])

  return (
    <>
      <header className="sticky top-0 z-50 h-12 bg-brand-700 dark:bg-dark-secondary flex items-center px-5 gap-5">
        {/* Logo */}
        <a href="/" className="shrink-0 text-base font-extrabold tracking-tight text-white" style={{ letterSpacing: '-0.05em' }}>
          Auto<span className="text-accent-400">QC</span>
        </a>

        {/* Desktop navigation */}
        <nav className="hidden lg:flex items-center gap-4" aria-label="Navigation principale">
          {navLinks.map((link) => {
            const active = isActive(link.href)
            return (
              <a
                key={link.href}
                href={link.href}
                className={`text-[11px] whitespace-nowrap transition-colors ${
                  active
                    ? 'text-white border-b-[1.5px] border-accent-400 pb-px font-medium'
                    : 'text-white/50 hover:text-white/80'
                }`}
              >
                {link.label}
              </a>
            )
          })}
        </nav>

        {/* Right section */}
        <div className="ml-auto flex items-center gap-2.5">
          {/* Stats badge */}
          {stats && (
            <span className="hidden xl:inline text-[10px] text-white/45 whitespace-nowrap">
              {stats.active_vehicles.toLocaleString('fr-CA')} véhicules · {stats.total_dealers.toLocaleString('fr-CA')} concess.
            </span>
          )}

          <ThemeToggle />

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-1.5 -mr-1.5 text-white/70 hover:text-white transition-colors"
            aria-label="Ouvrir le menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
            </svg>
          </button>
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
        className={`fixed top-0 right-0 z-50 h-full w-72 bg-white dark:bg-dark-secondary border-l border-surface-border dark:border-brand-700 transition-transform duration-300 ease-in-out lg:hidden ${
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border dark:border-brand-700">
          <span className="text-sm font-bold text-brand-700 dark:text-white">
            Auto<span className="text-accent-400">QC</span>
          </span>
          <button
            type="button"
            onClick={closeMobile}
            className="p-1.5 -mr-1.5 text-brand-400 dark:text-brand-400 hover:text-brand-700 dark:hover:text-white transition-colors"
            aria-label="Fermer le menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

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
                    ? 'text-brand-700 dark:text-white font-semibold bg-brand-50 dark:bg-brand-700/30'
                    : 'text-brand-500 dark:text-brand-400 hover:text-brand-700 dark:hover:text-white hover:bg-surface-muted dark:hover:bg-brand-700/20'
                }`}
              >
                {active && (
                  <span className="w-1 h-1 rounded-full bg-accent-400 shrink-0" />
                )}
                {link.label}
              </a>
            )
          })}
          {/* Historique crawl — secondary link */}
          <div className="mt-2 pt-2 border-t border-surface-border dark:border-brand-700">
            <a
              href="/crawl-history"
              onClick={closeMobile}
              className={`flex items-center gap-3 px-4 py-2.5 text-xs transition-colors ${
                isActive('/crawl-history')
                  ? 'text-brand-700 dark:text-white font-semibold bg-brand-50 dark:bg-brand-700/30'
                  : 'text-brand-400 dark:text-brand-500 hover:text-brand-600 dark:hover:text-brand-300'
              }`}
            >
              Historique crawl
            </a>
          </div>
        </nav>

        {stats && (
          <div className="mt-auto px-4 py-4 border-t border-surface-border dark:border-brand-700">
            <p className="text-xs text-brand-400 dark:text-brand-400">
              {stats.active_vehicles.toLocaleString('fr-CA')} véhicules
              <br />
              {stats.total_dealers.toLocaleString('fr-CA')} concessionnaires
            </p>
          </div>
        )}
      </div>
    </>
  )
}
