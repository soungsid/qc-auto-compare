import { useState } from 'react'

/**
 * FEATURE #1: Fingerprint badge with copy-to-clipboard functionality
 * Shows first 8 chars, full fingerprint on hover, copies on click
 */

interface Props {
  fingerprint: string
}

export function FingerprintBadge({ fingerprint }: Props) {
  const [copied, setCopied] = useState(false)
  
  const shortId = fingerprint.slice(0, 8)
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fingerprint)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy fingerprint:', err)
    }
  }
  
  return (
    <button
      type="button"
      onClick={handleCopy}
      title={`ID complet: ${fingerprint}\nCliquez pour copier`}
      data-testid="fingerprint-badge"
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-mono transition-colors ${
        copied
          ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
      }`}
    >
      <span>{shortId}</span>
      {copied ? (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  )
}
