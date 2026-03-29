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

function spaNavigate(e: React.MouseEvent<HTMLAnchorElement>) {
  e.preventDefault()
  const href = e.currentTarget.getAttribute('href')
  if (href) {
    window.history.pushState({}, '', href)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }
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
      <header className="sticky top-0 z-50 h-14 bg-charbon-900 flex items-center px-5 gap-6">
        {/* Logo */}
        <a href="/" onClick={spaNavigate} className="shrink-0 font-display font-bold text-xl tracking-tight">
          <span className="text-creme-200">Auto</span>
          <span className="text-ambre-400">QC</span>
        </a>

        {/* Desktop navigation */}
        <nav className="hidden lg:flex items-center gap-6" aria-label="Navigation principale">
          {navLinks.map((link) => {
            const active = isActive(link.href)
            return (
              <a
                key={link.href}
                href={link.href}
                onClick={spaNavigate}
                className={`uppercase tracking-widest text-[10px] font-medium whitespace-nowrap transition-colors ${
                  active
                    ? 'text-ambre-400'
                    : 'text-creme-300 hover:text-ambre-400'
                }`}
              >
                {link.label}
              </a>
            )
          })}
        </nav>

        {/* Right section */}
        <div className="ml-auto flex items-center gap-3">
          {/* Stats badge */}
          {stats && (
            <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ambre-400/10 text-[10px] font-medium text-ambre-400 whitespace-nowrap">
              {stats.active_vehicles.toLocaleString('fr-CA')} véhicules
            </span>
          )}

          <ThemeToggle />

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-1.5 -mr-1.5 text-creme-400 hover:text-creme-200 transition-colors"
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
          className="fixed inset-0 z-50 bg-charbon-900/60 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-72 bg-charbon-900 border-l border-charbon-700 transition-transform duration-300 ease-in-out lg:hidden ${
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-charbon-700">
          <span className="font-display font-bold text-lg">
            <span className="text-creme-200">Auto</span>
            <span className="text-ambre-400">QC</span>
          </span>
          <button
            type="button"
            onClick={closeMobile}
            className="p-1.5 -mr-1.5 text-creme-400 hover:text-creme-200 transition-colors"
            aria-label="Fermer le menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex flex-col py-3">
          {navLinks.map((link) => {
            const active = isActive(link.href)
            return (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => { spaNavigate(e); closeMobile() }}
                className={`flex items-center gap-3 px-5 py-3 uppercase tracking-widest text-[10px] font-medium transition-colors ${
                  active
                    ? 'text-ambre-400 bg-charbon-800'
                    : 'text-creme-400 hover:text-creme-200 hover:bg-charbon-800'
                }`}
              >
                {active && (
                  <span className="w-1 h-1 rounded-full bg-ambre-400 shrink-0" />
                )}
                {link.label}
              </a>
            )
          })}
          {/* Historique crawl — secondary link */}
          <div className="mt-2 pt-2 border-t border-charbon-700">
            <a
              href="/crawl-history"
              onClick={(e) => { spaNavigate(e); closeMobile() }}
              className={`flex items-center gap-3 px-5 py-3 uppercase tracking-widest text-[10px] transition-colors ${
                isActive('/crawl-history')
                  ? 'text-ambre-400 font-medium bg-charbon-800'
                  : 'text-acier-500 hover:text-creme-300'
              }`}
            >
              Historique crawl
            </a>
          </div>
        </nav>

        {stats && (
          <div className="mt-auto px-5 py-4 border-t border-charbon-700">
            <p className="text-[10px] uppercase tracking-widest text-acier-500">
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
