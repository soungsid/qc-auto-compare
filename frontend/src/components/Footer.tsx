/**
 * Footer commun à toute l'application — editorial automobile aesthetic
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
    <footer className="bg-charbon-900 transition-colors">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 py-10 sm:py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Logo & Tagline */}
          <div className="space-y-4">
            <h3 className="font-display font-bold text-xl tracking-tight">
              <span className="text-creme-200">Auto</span>
              <span className="text-ambre-400">QC</span>
            </h3>
            <p className="font-serif italic text-sm text-creme-400 leading-relaxed">
              L'éditorial automobile du Québec — comparez les prix des véhicules neufs et d'occasion chez les concessionnaires.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-[9px] font-medium text-ambre-400 uppercase tracking-widest mb-5">
              Navigation
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="/" className="text-creme-400 hover:text-creme-200 transition-colors">
                  Recherche de véhicules
                </a>
              </li>
              <li>
                <a href="/dealers" className="text-creme-400 hover:text-creme-200 transition-colors" data-testid="footer-dealers-link">
                  Concessionnaires
                </a>
              </li>
              <li>
                <a href="/crawl-history" className="text-creme-400 hover:text-creme-200 transition-colors">
                  Historique crawl
                </a>
              </li>
              <li>
                <a href="/about" className="text-creme-400 hover:text-creme-200 transition-colors">
                  À propos
                </a>
              </li>
              <li>
                <a href="/contact" className="text-creme-400 hover:text-creme-200 transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* SEO - Recherche par ville */}
          <div>
            <h4 className="text-[9px] font-medium text-ambre-400 uppercase tracking-widest mb-5">
              Par Ville
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="/?city=Montréal" className="text-creme-400 hover:text-creme-200 transition-colors">
                  Véhicules à Montréal
                </a>
              </li>
              <li>
                <a href="/?city=Québec" className="text-creme-400 hover:text-creme-200 transition-colors">
                  Véhicules à Québec
                </a>
              </li>
              <li>
                <a href="/?city=Laval" className="text-creme-400 hover:text-creme-200 transition-colors">
                  Véhicules à Laval
                </a>
              </li>
              <li>
                <a href="/?city=Brossard" className="text-creme-400 hover:text-creme-200 transition-colors">
                  Véhicules à Brossard
                </a>
              </li>
              <li>
                <a href="/?city=Lévis" className="text-creme-400 hover:text-creme-200 transition-colors">
                  Véhicules à Lévis
                </a>
              </li>
            </ul>
          </div>

          {/* SEO - Recherche par marque */}
          <div>
            <h4 className="text-[9px] font-medium text-ambre-400 uppercase tracking-widest mb-5">
              Par Marque
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="/?make=Nissan" className="text-creme-400 hover:text-creme-200 transition-colors">
                  Nissan
                </a>
              </li>
              <li>
                <a href="/?make=Toyota" className="text-creme-400 hover:text-creme-200 transition-colors">
                  Toyota
                </a>
              </li>
              <li>
                <a href="/?make=Hyundai" className="text-creme-400 hover:text-creme-200 transition-colors">
                  Hyundai
                </a>
              </li>
              <li>
                <a href="/?make=Kia" className="text-creme-400 hover:text-creme-200 transition-colors">
                  Kia
                </a>
              </li>
              <li>
                <a href="/?make=Chevrolet" className="text-creme-400 hover:text-creme-200 transition-colors">
                  Chevrolet
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Newsletter Section */}
        <div className="mt-12 pt-8 border-t border-charbon-700">
          <div className="max-w-md">
            <h4 className="text-[9px] font-medium text-ambre-400 uppercase tracking-widest mb-3">
              Restez informé
            </h4>
            <p className="text-sm text-creme-400 mb-4">
              Recevez les meilleures offres directement dans votre boîte mail.
            </p>
            <form className="flex gap-2" onSubmit={handleSubscribe}>
              <input
                type="email"
                required
                placeholder="Votre email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-4 py-2.5 text-sm border border-creme-400/20 rounded bg-transparent text-creme-200 placeholder-acier-500 focus:outline-none focus:ring-1 focus:ring-ambre-400 focus:border-ambre-400 min-h-[44px]"
              />
              <button
                type="submit"
                className="px-5 py-2.5 text-sm font-bold text-charbon-900 bg-ambre-400 hover:bg-ambre-300 rounded transition-colors min-h-[44px]"
              >
                S'abonner
              </button>
            </form>
            {subscribeStatus === 'success' && (
              <p className="mt-2 text-sm text-emerald-400">
                ✓ Merci ! Vous recevrez les meilleures offres.
              </p>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-charbon-700 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-acier-500">
          <div>
            © {currentYear} AutoQC. Tous droits réservés.
          </div>
          <div className="flex gap-6">
            <a href="/legal" className="hover:text-creme-200 transition-colors">
              Mentions légales
            </a>
            <a href="/privacy" className="hover:text-creme-200 transition-colors">
              Politique de confidentialité
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
