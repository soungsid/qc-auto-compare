import { useState } from 'react'
import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'
import { SEO, getOrganizationSchema } from '../components/SEO'
import { siteName, contactEmail } from '../config'

/**
 * Page Contact - Formulaire de contact
 */
export function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement actual form submission (email service integration)
    console.log('Form submitted:', formData)
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 5000)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="min-h-screen bg-surface-muted dark:bg-dark-primary text-brand-900 dark:text-brand-100 transition-colors flex flex-col">
      <SEO
        title="Contactez-nous"
        description={`Une question sur ${siteName} ? Contactez notre équipe pour toute demande d'information, ajout de concessionnaire ou suggestion d'amélioration.`}
        keywords={['contact', 'support', 'aide', 'question', siteName]}
        structuredData={getOrganizationSchema()}
      />
      <Navbar />

      {/* Main Content */}
      <main className="mx-auto w-full max-w-4xl px-6 py-12 flex-1">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Contact Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-brand-900 dark:text-brand-100 mb-4">
                Contactez-nous
              </h1>
              <p className="text-brand-500 dark:text-brand-400">
                Une question ? Une suggestion ? N'hésitez pas à nous contacter.
              </p>
            </div>

            {/* Contact Cards */}
            <div className="space-y-4">
              <div className="bg-white dark:bg-dark-primary rounded-lg border border-surface-border dark:border-brand-800 p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-brand-50 dark:bg-brand-900/30 rounded-lg">
                    <svg className="w-6 h-6 text-brand-700 dark:text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-brand-900 dark:text-brand-100 mb-1">Email</h3>
                    <a href={`mailto:${contactEmail}`} className="text-accent-500 dark:text-accent-400 hover:underline">
                      {contactEmail}
                    </a>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-dark-primary rounded-lg border border-surface-border dark:border-brand-800 p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-brand-900 dark:text-brand-100 mb-1">Localisation</h3>
                    <p className="text-brand-500 dark:text-brand-400">Montréal, Québec</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-dark-primary rounded-lg border border-surface-border dark:border-brand-800 p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-brand-900 dark:text-brand-100 mb-1">Heures de réponse</h3>
                    <p className="text-brand-500 dark:text-brand-400">Lun-Ven: 9h - 17h</p>
                    <p className="text-sm text-brand-400 dark:text-brand-400">Réponse sous 24-48h</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white dark:bg-dark-primary rounded-xl border border-surface-border dark:border-brand-800 p-8 shadow-sm">
            {submitted ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                  <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-brand-900 dark:text-brand-100 mb-2">Message envoyé !</h3>
                <p className="text-brand-500 dark:text-brand-400">
                  Nous vous répondrons dans les plus brefs délais.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-brand-700 dark:text-brand-300 mb-2">
                    Nom complet
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-brand-300 dark:border-brand-700 rounded-lg bg-white dark:bg-dark-secondary text-brand-900 dark:text-brand-100 focus:outline-none focus:ring-2 focus:ring-accent-400"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-brand-700 dark:text-brand-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-brand-300 dark:border-brand-700 rounded-lg bg-white dark:bg-dark-secondary text-brand-900 dark:text-brand-100 focus:outline-none focus:ring-2 focus:ring-accent-400"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-brand-700 dark:text-brand-300 mb-2">
                    Sujet
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-brand-300 dark:border-brand-700 rounded-lg bg-white dark:bg-dark-secondary text-brand-900 dark:text-brand-100 focus:outline-none focus:ring-2 focus:ring-accent-400"
                  >
                    <option value="">Sélectionnez un sujet</option>
                    <option value="general">Question générale</option>
                    <option value="dealer">Ajout de concessionnaire</option>
                    <option value="bug">Signaler un bug</option>
                    <option value="feature">Demande de fonctionnalité</option>
                    <option value="other">Autre</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-brand-700 dark:text-brand-300 mb-2">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="w-full px-4 py-2 border border-brand-300 dark:border-brand-700 rounded-lg bg-white dark:bg-dark-secondary text-brand-900 dark:text-brand-100 focus:outline-none focus:ring-2 focus:ring-accent-400"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full px-6 py-3 bg-brand-900 dark:bg-brand-100 text-white dark:text-brand-900 font-medium rounded-lg hover:bg-brand-800 dark:hover:bg-white transition-colors flex items-center justify-center gap-2"
                >
                  Envoyer le message
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
