import { useEffect } from 'react'

interface SEOProps {
  title: string
  description: string
  canonical?: string
  ogType?: 'website' | 'article' | 'product'
  ogImage?: string
  keywords?: string[]
  structuredData?: object
  noindex?: boolean
}

/**
 * Composant SEO pour gérer les meta tags de chaque page
 * Optimisé pour Google, Open Graph (Facebook), et Twitter Cards
 */
export function SEO({
  title,
  description,
  canonical,
  ogType = 'website',
  ogImage = 'https://qcautocompare.ca/og-image.jpg',
  keywords = [],
  structuredData,
  noindex = false
}: SEOProps) {
  const baseUrl = 'https://qcautocompare.ca'
  const fullTitle = title.includes('QC Auto Compare') ? title : `${title} | QC Auto Compare`
  const canonicalUrl = canonical || (typeof window !== 'undefined' ? window.location.href : baseUrl)

  useEffect(() => {
    // Update document title
    document.title = fullTitle

    // Update or create meta tags
    updateMetaTag('description', description)
    updateMetaTag('keywords', keywords.join(', '))
    
    // Open Graph tags
    updateMetaTag('og:title', fullTitle, 'property')
    updateMetaTag('og:description', description, 'property')
    updateMetaTag('og:type', ogType, 'property')
    updateMetaTag('og:url', canonicalUrl, 'property')
    updateMetaTag('og:image', ogImage, 'property')
    updateMetaTag('og:site_name', 'QC Auto Compare', 'property')
    updateMetaTag('og:locale', 'fr_CA', 'property')
    
    // Twitter Cards
    updateMetaTag('twitter:card', 'summary_large_image')
    updateMetaTag('twitter:title', fullTitle)
    updateMetaTag('twitter:description', description)
    updateMetaTag('twitter:image', ogImage)
    
    // Robots
    if (noindex) {
      updateMetaTag('robots', 'noindex, nofollow')
    } else {
      updateMetaTag('robots', 'index, follow')
    }
    
    // Canonical URL
    updateLinkTag('canonical', canonicalUrl)
    
    // Structured Data (JSON-LD)
    if (structuredData) {
      updateStructuredData(structuredData)
    }
  }, [title, description, canonical, ogType, ogImage, keywords, structuredData, noindex])

  return null // This component doesn't render anything
}

// Helper function to update or create meta tags
function updateMetaTag(name: string, content: string, attributeName: 'name' | 'property' = 'name') {
  if (!content) return
  
  let element = document.querySelector(`meta[${attributeName}="${name}"]`)
  
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attributeName, name)
    document.head.appendChild(element)
  }
  
  element.setAttribute('content', content)
}

// Helper function to update or create link tags
function updateLinkTag(rel: string, href: string) {
  if (!href) return
  
  let element = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement
  
  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', rel)
    document.head.appendChild(element)
  }
  
  element.href = href
}

// Helper function to update structured data (JSON-LD)
function updateStructuredData(data: object) {
  // Remove existing structured data
  const existingScript = document.querySelector('script[data-schema="structured-data"]')
  if (existingScript) {
    existingScript.remove()
  }
  
  // Add new structured data
  const script = document.createElement('script')
  script.type = 'application/ld+json'
  script.setAttribute('data-schema', 'structured-data')
  script.textContent = JSON.stringify(data)
  document.head.appendChild(script)
}

// Generate Organization structured data
export function getOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "QC Auto Compare",
    "url": "https://qcautocompare.ca",
    "logo": "https://qcautocompare.ca/logo.png",
    "description": "Comparateur de véhicules neufs et d'occasion au Québec",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Montréal",
      "addressRegion": "QC",
      "addressCountry": "CA"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "email": "contact@qcautocompare.ca",
      "contactType": "Customer Service"
    },
    "sameAs": [
      "https://facebook.com/qcautocompare",
      "https://twitter.com/qcautocompare"
    ]
  }
}

// Generate Vehicle structured data
export function getVehicleSchema(vehicle: any) {
  return {
    "@context": "https://schema.org",
    "@type": "Car",
    "name": `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
    "brand": {
      "@type": "Brand",
      "name": vehicle.make
    },
    "model": vehicle.model,
    "vehicleModelDate": vehicle.year,
    "mileageFromOdometer": {
      "@type": "QuantitativeValue",
      "value": vehicle.mileage_km,
      "unitCode": "KMT"
    },
    "vehicleTransmission": vehicle.transmission,
    "driveWheelConfiguration": vehicle.drivetrain,
    "bodyType": vehicle.body_type,
    "fuelType": vehicle.fuel_type,
    "color": vehicle.color_ext,
    "itemCondition": vehicle.condition === 'new' ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition',
    "offers": {
      "@type": "Offer",
      "price": vehicle.sale_price,
      "priceCurrency": "CAD",
      "availability": "https://schema.org/InStock",
      "url": vehicle.listing_url,
      "seller": {
        "@type": "AutoDealer",
        "name": vehicle.dealer?.name
      }
    },
    "image": vehicle.image_url
  }
}

// Generate AutoDealer structured data
export function getDealerSchema(dealer: any) {
  return {
    "@context": "https://schema.org",
    "@type": "AutoDealer",
    "name": dealer.name,
    "url": dealer.website,
    "telephone": dealer.phone,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": dealer.address,
      "addressLocality": dealer.city,
      "addressRegion": "QC",
      "addressCountry": "CA"
    }
  }
}

// Generate ItemList for vehicle listings
export function getItemListSchema(vehicles: any[], page: number) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": vehicles.map((vehicle, index) => ({
      "@type": "ListItem",
      "position": (page - 1) * vehicles.length + index + 1,
      "item": {
        "@type": "Car",
        "name": `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
        "url": vehicle.listing_url,
        "image": vehicle.image_url,
        "offers": {
          "@type": "Offer",
          "price": vehicle.sale_price,
          "priceCurrency": "CAD"
        }
      }
    }))
  }
}

// Generate BreadcrumbList
export function getBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  }
}
