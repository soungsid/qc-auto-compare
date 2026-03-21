/**
 * Footer commun à toute l'application
 * Inclut: Liens de navigation, SEO (villes, marques), Newsletter/Contact
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
    // TODO: brancher sur l'API newsletter
    setSubscribeStatus('success')
    setEmail('')
    setTimeout(() => setSubscribeStatus('idle'), 4000)
  }

  return (
    <footer className="border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-colors">
      <div className="mx-auto max-w-screen-2xl px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{siteName}</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Comparez les prix des véhicules neufs chez les concessionnaires directs au Québec. 
              Trouvez la meilleure offre en quelques clics.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-4">
              Navigation
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Recherche de véhicules
                </a>
              </li>
              <li>
                <a href="/dealers" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" data-testid="footer-dealers-link">
                  Concessionnaires
                </a>
              </li>
              <li>
                <a href="/about" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  À propos
                </a>
              </li>
              <li>
                <a href="/contact" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Contact
                </a>
              </li>
              <li>
                <a href="/blog" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Blog
                </a>
              </li>
            </ul>
          </div>

          {/* SEO - Recherche par ville */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-4">
              Par Ville
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/?city=Montréal" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Véhicules à Montréal
                </a>
              </li>
              <li>
                <a href="/?city=Québec" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Véhicules à Québec
                </a>
              </li>
              <li>
                <a href="/?city=Laval" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Véhicules à Laval
                </a>
              </li>
              <li>
                <a href="/?city=Brossard" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Véhicules à Brossard
                </a>
              </li>
              <li>
                <a href="/?city=Lévis" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Véhicules à Lévis
                </a>
              </li>
            </ul>
          </div>

          {/* SEO - Recherche par marque */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-4">
              Par Marque
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/?make=Nissan" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Nissan
                </a>
              </li>
              <li>
                <a href="/?make=Toyota" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Toyota
                </a>
              </li>
              <li>
                <a href="/?make=Hyundai" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Hyundai
                </a>
              </li>
              <li>
                <a href="/?make=Kia" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Kia
                </a>
              </li>
              <li>
                <a href="/?make=Chevrolet" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Chevrolet
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Newsletter Section */}
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-slate-700">
          <div className="max-w-md">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Restez informé
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Recevez les meilleures offres directement dans votre boîte mail.
            </p>
            <form className="flex gap-2" onSubmit={handleSubscribe}>
              <input
                type="email"
                required
                placeholder="Votre email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                S'abonner
              </button>
            </form>
            {subscribeStatus === 'success' && (
              <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                ✓ Merci ! Vous recevrez les meilleures offres.
              </p>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <div>
            © {currentYear} {siteName}. Tous droits réservés.
          </div>
          <div className="flex gap-6">
            <a href="/legal" className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
              Mentions légales
            </a>
            <a href="/privacy" className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
              Politique de confidentialité
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
