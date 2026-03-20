import { useEffect } from 'react'
import { gtmId } from '../config'

/**
 * Composant Google Tag Manager
 * Charge le script GTM uniquement si VITE_GTM_ID est configuré
 */
export function GTM() {
  useEffect(() => {
    // Ne pas charger si pas de GTM ID configuré
    if (!gtmId || gtmId === '') {
      return
    }

    // Vérifier si GTM est déjà chargé
    if (window.dataLayer) {
      return
    }

    // Initialiser dataLayer
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push({
      'gtm.start': new Date().getTime(),
      event: 'gtm.js'
    })

    // Créer et insérer le script GTM
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`
    
    const firstScript = document.getElementsByTagName('script')[0]
    firstScript.parentNode?.insertBefore(script, firstScript)

    // Ajouter le noscript iframe au body
    const noscript = document.createElement('noscript')
    const iframe = document.createElement('iframe')
    iframe.src = `https://www.googletagmanager.com/ns.html?id=${gtmId}`
    iframe.height = '0'
    iframe.width = '0'
    iframe.style.display = 'none'
    iframe.style.visibility = 'hidden'
    noscript.appendChild(iframe)
    document.body.insertBefore(noscript, document.body.firstChild)
  }, [])

  return null
}

// Déclaration pour TypeScript
declare global {
  interface Window {
    dataLayer: any[]
  }
}
