import { ThemeToggle } from '../components/ThemeToggle'
import { Footer } from '../components/Footer'
import { SEO, getOrganizationSchema } from '../components/SEO'
import { siteName } from '../config'

/**
 * Page À propos - Présentation du site
 */
export function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors flex flex-col">
      <SEO
        title={`À propos de ${siteName}`}
        description={`${siteName} vous aide à trouver les meilleures offres de véhicules neufs et d'occasion chez les concessionnaires directs au Québec. Service gratuit et transparent.`}
        keywords={['à propos', 'mission', siteName, 'comparateur auto', 'Québec']}
        structuredData={getOrganizationSchema()}
      />
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm transition-colors">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-6 py-4">
          <div>
            <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <svg className="w-7 h-7 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {siteName}
              </h1>
            </a>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-4xl px-6 py-12 flex-1">
        <article className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-8 md:p-12 shadow-sm">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
            À propos de {siteName}
          </h1>

          <div className="prose dark:prose-invert max-w-none space-y-6 text-gray-700 dark:text-gray-300">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Notre Mission
              </h2>
              <p>
                {siteName} a été créé avec une mission simple mais ambitieuse : <strong>faciliter la recherche et la comparaison de véhicules</strong> pour les consommateurs québécois. Nous croyons que chaque acheteur mérite d'avoir accès à des informations complètes et transparentes pour prendre la meilleure décision d'achat.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Comment ça fonctionne ?
              </h2>
              <p>
                Notre plateforme agrège automatiquement les informations publiquement disponibles sur les sites web des concessionnaires automobiles directs au Québec. Nous collectons les données sur les véhicules disponibles, les prix, les offres de financement et les caractéristiques techniques.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Mise à jour régulière</strong> - Notre système actualise les informations toutes les 12 heures</li>
                <li><strong>Données publiques uniquement</strong> - Nous respectons la vie privée et ne collectons que des informations publiques</li>
                <li><strong>Comparaison facile</strong> - Interface intuitive pour comparer rapidement plusieurs véhicules</li>
                <li><strong>Filtres avancés</strong> - Recherche par marque, modèle, prix, kilométrage, type de carrosserie, carburant, et plus</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Notre Engagement
              </h2>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span><strong>Transparence totale</strong> - Toutes nos sources sont des sites publics de concessionnaires</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span><strong>Gratuit pour tous</strong> - Aucun frais caché, service 100% gratuit</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span><strong>Indépendant</strong> - Nous ne vendons pas de véhicules, nous vous aidons à trouver le meilleur</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span><strong>Respect de la vie privée</strong> - Aucune collecte de données personnelles</span>
                  </li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Couverture
              </h2>
              <p>
                Nous couvrons les principaux concessionnaires directs dans les régions de <strong>Montréal et Québec</strong>, avec une expansion continue vers d'autres régions du Québec. Notre base de données inclut actuellement :
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg">
                  <p className="font-semibold text-gray-900 dark:text-white">Nissan</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">4 concessionnaires</p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg">
                  <p className="font-semibold text-gray-900 dark:text-white">Toyota</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">3 concessionnaires</p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg">
                  <p className="font-semibold text-gray-900 dark:text-white">Hyundai</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">3 concessionnaires</p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg">
                  <p className="font-semibold text-gray-900 dark:text-white">Kia</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">3 concessionnaires</p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg">
                  <p className="font-semibold text-gray-900 dark:text-white">Chevrolet</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">2 concessionnaires</p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg">
                  <p className="font-semibold text-gray-900 dark:text-white">+ Plus</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">En expansion</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Contactez-nous
              </h2>
              <p>
                Vous avez des questions, des suggestions ou souhaitez voir votre concessionnaire ajouté à notre plateforme ?
              </p>
              <div className="mt-4">
                <a
                  href="/contact"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Contactez-nous
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </a>
              </div>
            </section>
          </div>
        </article>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
