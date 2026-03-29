/**
 * Configuration centralisée de l'application
 * Toutes les variables d'environnement sont accessibles ici
 */

// Variables d'environnement avec valeurs par défaut
export const config = {
  // Nom du site (configurable via VITE_SITE_NAME)
  siteName: import.meta.env.VITE_SITE_NAME || 'AutoQC',
  
  // Tagline (pages marketing uniquement, PAS dans la navbar)
  tagline: 'Comparez. Choisissez.',
  
  // Domaine du site (configurable via VITE_DOMAIN)
  domain: import.meta.env.VITE_DOMAIN || 'auto.canadaquebec.ca',
  
  // URL de base (dérivée du domaine)
  get baseUrl(): string {
    return `https://${this.domain}`
  },
  
  // Email de contact (dérivé du domaine)
  get contactEmail(): string {
    return `contact@${this.domain}`
  },
  
  // GTM ID (configurable via VITE_GTM_ID)
  gtmId: import.meta.env.VITE_GTM_ID || '',
  
  // Backend URL
  backendUrl: import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || '',
}

// Export des valeurs individuelles pour faciliter l'import
export const { siteName, domain, baseUrl, contactEmail, gtmId, backendUrl } = config
