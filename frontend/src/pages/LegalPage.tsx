import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'
import { SEO, getOrganizationSchema } from '../components/SEO'
import { siteName, baseUrl, contactEmail } from '../config'

/**
 * Page Mentions Légales - Explique la collecte et l'agrégation de données publiques
 */
export function LegalPage() {
  return (
    <div className="min-h-screen bg-brand-50 dark:bg-dark-primary text-brand-900 dark:text-brand-100 transition-colors flex flex-col">
      <SEO
        title="Mentions Légales"
        description={`Informations légales sur ${siteName} : collecte de données publiques, droits d'auteur, et politique de confidentialité.`}
        keywords={['mentions légales', 'confidentialité', 'données publiques', 'RGPD', 'légal']}
        structuredData={getOrganizationSchema()}
        noindex={true}
      />
      <Navbar />

      {/* Main Content */}
      <main className="mx-auto w-full max-w-4xl px-6 py-12 flex-1">
        <article className="bg-white dark:bg-brand-900 rounded-xl border border-surface-border dark:border-brand-800 p-8 md:p-12 shadow-sm">
          <h1 className="text-3xl md:text-4xl font-bold text-brand-900 dark:text-brand-100 mb-4">
            Mentions Légales
          </h1>
          <p className="text-sm text-brand-500 dark:text-brand-400 mb-8">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <div className="prose dark:prose-invert max-w-none space-y-6 text-brand-700 dark:text-brand-300">
            {/* Section 1 */}
            <section>
              <h2 className="text-2xl font-bold text-brand-900 dark:text-brand-100 mb-3">
                1. Nature du service
              </h2>
              <p>
                {siteName} est une plateforme de comparaison de prix de véhicules neufs et d'occasion
                au Québec. Notre service permet aux utilisateurs de comparer les offres de différents
                concessionnaires directs dans la région de Montréal et Québec.
              </p>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-bold text-brand-900 dark:text-brand-100 mb-3">
                2. Collecte et agrégationde données publiques
              </h2>
              <p className="mb-3">
                <strong>{siteName} collecte uniquement des informations publiquement disponibles</strong> sur
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
              <h2 className="text-2xl font-bold text-brand-900 dark:text-brand-100 mb-3">
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
              <h2 className="text-2xl font-bold text-brand-900 dark:text-brand-100 mb-3">
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
              <h2 className="text-2xl font-bold text-brand-900 dark:text-brand-100 mb-3">
                5. Droit d'auteuret propriété intellectuelle
              </h2>
              <p>
                Les données affichées sur {siteName} proviennent de sources publiques et
                appartiennent à leurs propriétaires respectifs (concessionnaires, constructeurs automobiles).
                Le design, la structure et les fonctionnalités de notre plateforme sont protégés par le
                droit d'auteur.
              </p>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-2xl font-bold text-brand-900 dark:text-brand-100 mb-3">
                6. Respect des robots.txtet politiques des sites
              </h2>
              <p>
                Notre système de collecte automatisée respecte les fichiers robots.txt et les politiques
                d'utilisation des sites web des concessionnaires. Nous limitons la fréquence de nos
                requêtes pour ne pas surcharger les serveurs des concessionnaires.
              </p>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-2xl font-bold text-brand-900 dark:text-brand-100 mb-3">
                7. Demande de retraitd'informations
              </h2>
              <p>
                Si vous êtes un concessionnaire ou un propriétaire de données et souhaitez que vos
                informations soient retirées ou modifiées sur notre plateforme, veuillez nous contacter à
                l'adresse email suivante :{' '}
                <a href={`mailto:${contactEmail}`} className="text-accent-500 dark:text-accent-400 hover:underline">
                  {contactEmail}
                </a>
              </p>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-2xl font-bold text-brand-900 dark:text-brand-100 mb-3">
                8. Limitation de responsabilité
              </h2>
              <p>
                {siteName} ne peut être tenu responsable des inexactitudes, erreurs ou omissions
                dans les informations affichées. Les utilisateurs sont invités à vérifier directement
                auprès des concessionnaires avant de prendre toute décision d'achat.
              </p>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-2xl font-bold text-brand-900 dark:text-brand-100 mb-3">
                9. Contact
              </h2>
              <p>
                Pour toute question concernant ces mentions légales ou notre service, vous pouvez nous
                contacter :
              </p>
              <div className="mt-3 bg-brand-50 dark:bg-brand-800 p-4 rounded-lg">
                <p className="font-medium">{siteName}</p>
                <p>Email : <a href={`mailto:${contactEmail}`} className="text-accent-500 dark:text-accent-400 hover:underline">{contactEmail}</a></p>
                <p>Site web : <a href={baseUrl} className="text-accent-500 dark:text-accent-400 hover:underline">{baseUrl.replace('https://', '')}</a></p>
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
