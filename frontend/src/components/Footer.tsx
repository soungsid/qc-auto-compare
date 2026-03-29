/**
 * Footer commun à toute l'application
 */

import { useState } from 'react'
import { siteName } from '../config'

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
    <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-colors">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 py-10 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{siteName}</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Comparez les prix des véhicules neufs chez les concessionnaires directs au Québec. 
              Trouvez la meilleure offre en quelques clics.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
              Navigation
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="/" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                  Recherche de véhicules
                </a>
              </li>
              <li>
                <a href="/dealers" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors" data-testid="footer-dealers-link">
                  Concessionnaires
                </a>
              </li>
              <li>
                <a href="/crawl-history" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                  Historique crawl
                </a>
              </li>
              <li>
                <a href="/about" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                  À propos
                </a>
              </li>
              <li>
                <a href="/contact" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* SEO - Recherche par ville */}
          <div>
            <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
              Par Ville
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="/?city=Montréal" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                  Véhicules à Montréal
                </a>
              </li>
              <li>
                <a href="/?city=Québec" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                  Véhicules à Québec
                </a>
              </li>
              <li>
                <a href="/?city=Laval" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                  Véhicules à Laval
                </a>
              </li>
              <li>
                <a href="/?city=Brossard" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                  Véhicules à Brossard
                </a>
              </li>
              <li>
                <a href="/?city=Lévis" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                  Véhicules à Lévis
                </a>
              </li>
            </ul>
          </div>

          {/* SEO - Recherche par marque */}
          <div>
            <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
              Par Marque
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="/?make=Nissan" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                  Nissan
                </a>
              </li>
              <li>
                <a href="/?make=Toyota" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                  Toyota
                </a>
              </li>
              <li>
                <a href="/?make=Hyundai" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                  Hyundai
                </a>
              </li>
              <li>
                <a href="/?make=Kia" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                  Kia
                </a>
              </li>
              <li>
                <a href="/?make=Chevrolet" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                  Chevrolet
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Newsletter Section */}
        <div className="mt-10 pt-8 border-t border-zinc-200 dark:border-zinc-800">
          <div className="max-w-md">
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Restez informé
            </h4>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              Recevez les meilleures offres directement dans votre boîte mail.
            </p>
            <form className="flex gap-2" onSubmit={handleSubscribe}>
              <input
                type="email"
                required
                placeholder="Votre email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-4 py-2.5 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 min-h-[44px]"
              />
              <button
                type="submit"
                className="px-5 py-2.5 text-sm font-medium text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white rounded-lg transition-colors min-h-[44px]"
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
        <div className="mt-8 pt-8 border-t border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-zinc-400 dark:text-zinc-500">
          <div>
            © {currentYear} {siteName}. Tous droits réservés.
          </div>
          <div className="flex gap-6">
            <a href="/legal" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
              Mentions légales
            </a>
            <a href="/privacy" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
              Politique de confidentialité
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
