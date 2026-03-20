import { ThemeToggle } from '../components/ThemeToggle'
import { Footer } from '../components/Footer'

/**
 * Page Mentions Légales - Explique la collecte et l'agrégation de données publiques
 */
export function LegalPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm transition-colors">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-6 py-4">
          <div>
            <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <svg className="w-7 h-7 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                QC Auto Compare
              </h1>
            </a>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-4xl px-6 py-12 flex-1">
        <article className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-8 md:p-12 shadow-sm">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Mentions Légales
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <div className="prose dark:prose-invert max-w-none space-y-6 text-gray-700 dark:text-gray-300">
            {/* Section 1 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                1. Nature du service
              </h2>
              <p>
                QC Auto Compare est une plateforme de comparaison de prix de véhicules neufs et d'occasion
                au Québec. Notre service permet aux utilisateurs de comparer les offres de différents
                concessionnaires directs dans la région de Montréal et Québec.
              </p>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                2. Collecte et agrégation de données publiques
              </h2>
              <p className="mb-3">
                <strong>QC Auto Compare collecte uniquement des informations publiquement disponibles</strong> sur
                les sites web des concessionnaires automobiles. Ces informations incluent :
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Les véhicules disponibles à la vente (marque, modèle, année, prix)</li>
                <li>Les caractéristiques techniques des véhicules (kilométrage, transmission, etc.)</li>
                <li>Les offres de financement et de location publiquement affichées</li>
                <li>Les coordonnées publiques des concessionnaires (nom, adresse, téléphone, site web)</li>
              </ul>
              <p className="mt-3">
                Nous <strong>n'accédons à aucune donnée privée ou protégée</strong>. Toutes les informations
                agrégées sur notre plateforme sont des données que les concessionnaires ont volontairement
                rendues publiques sur leurs sites web officiels.
              </p>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                3. Objectif de la plateforme
              </h2>
              <p>
                Notre objectif est de faciliter la recherche et la comparaison de véhicules pour les
                consommateurs québécois en centralisant les informations publiquement disponibles sur
                une seule plateforme conviviale. Nous ne vendons pas de véhicules et n'agissons pas
                en tant qu'intermédiaire commercial.
              </p>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                4. Exactitude des informations
              </h2>
              <p>
                Bien que nous nous efforcions de maintenir les informations à jour en effectuant des
                mises à jour régulières, nous ne pouvons garantir l'exactitude ou la disponibilité en
                temps réel de tous les véhicules affichés. Les prix, disponibilités et offres peuvent
                varier. Nous recommandons aux utilisateurs de contacter directement les concessionnaires
                pour confirmer les détails.
              </p>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                5. Droit d'auteur et propriété intellectuelle
              </h2>
              <p>
                Les données affichées sur QC Auto Compare proviennent de sources publiques et
                appartiennent à leurs propriétaires respectifs (concessionnaires, constructeurs automobiles).
                Le design, la structure et les fonctionnalités de notre plateforme sont protégés par le
                droit d'auteur.
              </p>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                6. Respect des robots.txt et politiques des sites
              </h2>
              <p>
                Notre système de collecte automatisée respecte les fichiers robots.txt et les politiques
                d'utilisation des sites web des concessionnaires. Nous limitons la fréquence de nos
                requêtes pour ne pas surcharger les serveurs des concessionnaires.
              </p>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                7. Demande de retrait d'informations
              </h2>
              <p>
                Si vous êtes un concessionnaire ou un propriétaire de données et souhaitez que vos
                informations soient retirées ou modifiées sur notre plateforme, veuillez nous contacter à
                l'adresse email suivante :{' '}
                <a href="mailto:contact@qcautocompare.ca" className="text-blue-600 dark:text-blue-400 hover:underline">
                  contact@qcautocompare.ca
                </a>
              </p>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                8. Limitation de responsabilité
              </h2>
              <p>
                QC Auto Compare ne peut être tenu responsable des inexactitudes, erreurs ou omissions
                dans les informations affichées. Les utilisateurs sont invités à vérifier directement
                auprès des concessionnaires avant de prendre toute décision d'achat.
              </p>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                9. Contact
              </h2>
              <p>
                Pour toute question concernant ces mentions légales ou notre service, vous pouvez nous
                contacter :
              </p>
              <div className="mt-3 bg-gray-50 dark:bg-slate-700 p-4 rounded-lg">
                <p className="font-medium">QC Auto Compare</p>
                <p>Email : <a href="mailto:contact@qcautocompare.ca" className="text-blue-600 dark:text-blue-400 hover:underline">contact@qcautocompare.ca</a></p>
                <p>Site web : <a href="https://qcautocompare.ca" className="text-blue-600 dark:text-blue-400 hover:underline">qcautocompare.ca</a></p>
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
