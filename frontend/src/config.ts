/**
 * Configuration centralisée de l'application
 * Toutes les variables d'environnement sont accessibles ici
 */

// Variables d'environnement avec valeurs par défaut
export const config = {
  // Nom du site (configurable via VITE_SITE_NAME)
  siteName: import.meta.env.VITE_SITE_NAME || 'Auto Québec',
  
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
  backendUrl: import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || 'https://vehicle-search-fix.preview.emergentagent.com',
}

// Export des valeurs individuelles pour faciliter l'import
export const { siteName, domain, baseUrl, contactEmail, gtmId, backendUrl } = config
