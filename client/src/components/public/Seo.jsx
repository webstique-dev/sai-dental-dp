import { useEffect } from 'react'
import { CLINIC } from '../../data/clinic'

// Lightweight per-page SEO: document title + meta description (+ OG overrides).
export default function Seo({ title, description }) {
  useEffect(() => {
    const full = title ? `${title} | ${CLINIC.name}` : CLINIC.name
    document.title = full

    let meta = document.querySelector('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'description')
      document.head.appendChild(meta)
    }
    if (description) meta.setAttribute('content', description)

    let og = document.querySelector('meta[property="og:title"]')
    if (og) og.setAttribute('content', full)

    let ogDesc = document.querySelector('meta[property="og:description"]')
    if (ogDesc && description) ogDesc.setAttribute('content', description)
  }, [title, description])

  return null
}