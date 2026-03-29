/**
 * Footer commun à toute l'application
 */

import { useState } from 'react'

export function Footer() {
  const currentYear = new Date().getFullYear()
  const [email, setEmail] = useState('')
  const [subscribeStatus, setSubscribeStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleSubscribe = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!email) return
    setSubscribeStatus('success')
    setEmail('')
    setTimeout(() => setSubscribeStatus('idle'), 4000)
  }

  return (
    <footer className="border-t border-surface-border dark:border-brand-700 bg-white dark:bg-dark-secondary transition-colors">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 py-10 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="space-y-3">
            <h3 className="text-base font-extrabold text-brand-700 dark:text-white" style={{ letterSpacing: '-0.05em' }}>
              Auto<span className="text-accent-400">QC</span>
            </h3>
            <p className="text-sm text-brand-400 dark:text-brand-400 leading-relaxed">
              Comparez les prix des véhicules neufs et d'occasion chez les concessionnaires au Québec.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-[9px] font-bold text-brand-400 dark:text-brand-500 uppercase tracking-[0.1em] mb-4">
              Navigation
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="/" className="text-brand-500 dark:text-brand-400 hover:text-brand-700 dark:hover:text-white transition-colors">
                  Recherche de véhicules
                </a>
              </li>
              <li>
                <a href="/dealers" className="text-brand-500 dark:text-brand-400 hover:text-brand-700 dark:hover:text-white transition-colors" data-testid="footer-dealers-link">
                  Concessionnaires
                </a>
              </li>
              <li>
                <a href="/crawl-history" className="text-brand-500 dark:text-brand-400 hover:text-brand-700 dark:hover:text-white transition-colors">
                  Historique crawl
                </a>
              </li>
              <li>
                <a href="/about" className="text-brand-500 dark:text-brand-400 hover:text-brand-700 dark:hover:text-white transition-colors">
                  À propos
                </a>
              </li>
              <li>
                <a href="/contact" className="text-brand-500 dark:text-brand-400 hover:text-brand-700 dark:hover:text-white transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* SEO - Recherche par ville */}
          <div>
            <h4 className="text-[9px] font-bold text-brand-400 dark:text-brand-500 uppercase tracking-[0.1em] mb-4">
              Par Ville
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="/?city=Montréal" className="text-brand-500 dark:text-brand-400 hover:text-brand-700 dark:hover:text-white transition-colors">
                  Véhicules à Montréal
                </a>
              </li>
              <li>
                <a href="/?city=Québec" className="text-brand-500 dark:text-brand-400 hover:text-brand-700 dark:hover:text-white transition-colors">
                  Véhicules à Québec
                </a>
              </li>
              <li>
                <a href="/?city=Laval" className="text-brand-500 dark:text-brand-400 hover:text-brand-700 dark:hover:text-white transition-colors">
                  Véhicules à Laval
                </a>
              </li>
              <li>
                <a href="/?city=Brossard" className="text-brand-500 dark:text-brand-400 hover:text-brand-700 dark:hover:text-white transition-colors">
                  Véhicules à Brossard
                </a>
              </li>
              <li>
                <a href="/?city=Lévis" className="text-brand-500 dark:text-brand-400 hover:text-brand-700 dark:hover:text-white transition-colors">
                  Véhicules à Lévis
                </a>
              </li>
            </ul>
          </div>

          {/* SEO - Recherche par marque */}
          <div>
            <h4 className="text-[9px] font-bold text-brand-400 dark:text-brand-500 uppercase tracking-[0.1em] mb-4">
              Par Marque
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="/?make=Nissan" className="text-brand-500 dark:text-brand-400 hover:text-brand-700 dark:hover:text-white transition-colors">
                  Nissan
                </a>
              </li>
              <li>
                <a href="/?make=Toyota" className="text-brand-500 dark:text-brand-400 hover:text-brand-700 dark:hover:text-white transition-colors">
                  Toyota
                </a>
              </li>
              <li>
                <a href="/?make=Hyundai" className="text-brand-500 dark:text-brand-400 hover:text-brand-700 dark:hover:text-white transition-colors">
                  Hyundai
                </a>
              </li>
              <li>
                <a href="/?make=Kia" className="text-brand-500 dark:text-brand-400 hover:text-brand-700 dark:hover:text-white transition-colors">
                  Kia
                </a>
              </li>
              <li>
                <a href="/?make=Chevrolet" className="text-brand-500 dark:text-brand-400 hover:text-brand-700 dark:hover:text-white transition-colors">
                  Chevrolet
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Newsletter Section */}
        <div className="mt-10 pt-8 border-t border-surface-border dark:border-brand-700">
          <div className="max-w-md">
            <h4 className="text-sm font-bold text-brand-700 dark:text-white mb-2">
              Restez informé
            </h4>
            <p className="text-sm text-brand-400 dark:text-brand-400 mb-4">
              Recevez les meilleures offres directement dans votre boîte mail.
            </p>
            <form className="flex gap-2" onSubmit={handleSubscribe}>
              <input
                type="email"
                required
                placeholder="Votre email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-4 py-2.5 text-sm border border-surface-border dark:border-brand-600 rounded bg-white dark:bg-dark-tertiary text-brand-700 dark:text-brand-200 placeholder-brand-300 dark:placeholder-brand-500 focus:outline-none focus:ring-2 focus:ring-accent-400 min-h-[44px]"
              />
              <button
                type="submit"
                className="px-5 py-2.5 text-sm font-bold text-white bg-accent-400 hover:bg-accent-500 rounded transition-colors min-h-[44px]"
              >
                S'abonner
              </button>
            </form>
            {subscribeStatus === 'success' && (
              <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">
                ✓ Merci ! Vous recevrez les meilleures offres.
              </p>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-surface-border dark:border-brand-700 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-brand-400 dark:text-brand-500">
          <div>
            © {currentYear} AutoQC. Tous droits réservés.
          </div>
          <div className="flex gap-6">
            <a href="/legal" className="hover:text-brand-700 dark:hover:text-white transition-colors">
              Mentions légales
            </a>
            <a href="/privacy" className="hover:text-brand-700 dark:hover:text-white transition-colors">
              Politique de confidentialité
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
