import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'
import { SEO, getOrganizationSchema, getBreadcrumbSchema } from '../components/SEO'
import { siteName, baseUrl } from '../config'

/**
 * Page Blog - Articles et actualités
 */
export function BlogPage() {
  // Mock blog posts
  const posts = [
    {
      id: 1,
      title: "Guide d'achat : Comment choisir son premier véhicule électrique",
      excerpt: "Tout ce que vous devez savoir avant d'acheter un véhicule électrique au Québec : autonomie, bornes de recharge, subventions, et plus.",
      date: "15 mars 2026",
      category: "Guide d'achat",
      image: "🔋"
    },
    {
      id: 2,
      title: "Les meilleures offres de financement ce mois-ci",
      excerpt: "Découvrez les promotions et taux de financement les plus avantageux chez les concessionnaires québécois pour le mois de mars.",
      date: "10 mars 2026",
      category: "Actualités",
      image: "💰"
    },
    {
      id: 3,
      title: "Comparatif : VUS compacts 2026",
      excerpt: "Nous comparons les VUS compacts les plus populaires disponibles au Québec : Nissan Kicks, Toyota RAV4, Hyundai Tucson, et plus.",
      date: "5 mars 2026",
      category: "Comparatif",
      image: "🚙"
    },
    {
      id: 4,
      title: "Conseils pour négocier le meilleur prix chez un concessionnaire",
      excerpt: "Des stratégies éprouvées pour obtenir le meilleur prix lors de l'achat de votre prochain véhicule.",
      date: "28 février 2026",
      category: "Conseils",
      image: "📊"
    },
    {
      id: 5,
      title: "L'impact des taux d'intérêt sur l'achat automobile",
      excerpt: "Comment les changements de taux d'intérêt affectent votre budget automobile et comment vous adapter.",
      date: "20 février 2026",
      category: "Finance",
      image: "📈"
    },
    {
      id: 6,
      title: "Top 10 des véhicules les plus économiques en carburant",
      excerpt: "Économisez à la pompe avec notre sélection des véhicules les plus économes en carburant disponibles au Québec.",
      date: "12 février 2026",
      category: "Top 10",
      image: "⛽"
    }
  ]

  const breadcrumbs = getBreadcrumbSchema([
    { name: 'Accueil', url: baseUrl },
    { name: 'Blog', url: `${baseUrl}/blog` }
  ])

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors flex flex-col">
      <SEO
        title="Blog - Guides et conseils auto"
        description="Découvrez nos guides d'achat, comparatifs de véhicules, conseils de négociation et actualités du marché automobile québécois."
        keywords={['blog', 'guide achat', 'conseils auto', 'comparatif véhicules', 'actualités auto', 'Québec']}
        structuredData={{
          "@context": "https://schema.org",
          "@graph": [getOrganizationSchema(), breadcrumbs]
        }}
      />
      <Navbar />

      {/* Main Content */}
      <main className="mx-auto w-full max-w-screen-xl px-6 py-12 flex-1">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            Blog
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Conseils, guides d'achat, et actualités du monde automobile québécois
          </p>
        </div>

        {/* Coming Soon Notice */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-8">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Bientôt disponible</h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Notre section blog est en cours de développement. Les articles ci-dessous sont des exemples de contenu à venir. Abonnez-vous à notre newsletter pour être informé du lancement !
              </p>
            </div>
          </div>
        </div>

        {/* Blog Posts Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <article
              key={post.id}
              className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              {/* Image placeholder */}
              <div className="aspect-video bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-6xl">{post.image}</span>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Category & Date */}
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                    {post.category}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">{post.date}</span>
                </div>

                {/* Title */}
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2 line-clamp-2">
                  {post.title}
                </h2>

                {/* Excerpt */}
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4 line-clamp-3">
                  {post.excerpt}
                </p>

                {/* Read More */}
                <button className="inline-flex items-center gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:underline">
                  Lire la suite
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            </article>
          ))}
        </div>

        {/* Newsletter CTA */}
        <div className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Restez informé de nos nouveaux articles
          </h2>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
            Recevez nos derniers guides d'achat, comparatifs, et conseils directement dans votre boîte mail.
          </p>
          <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Votre email"
              className="flex-1 px-4 py-3 rounded-lg bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-white"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-white text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors"
            >
              S'abonner
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
