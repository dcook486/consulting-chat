import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const KB_DIR = join(__dirname, '..', 'knowledge-base')

/**
 * Load all markdown files from the knowledge base directory.
 * Returns an array of { filename, title, content, sections }.
 */
export function loadKnowledgeBase() {
  const files = readdirSync(KB_DIR).filter(f => f.endsWith('.md'))
  return files.map(filename => {
    const raw = readFileSync(join(KB_DIR, filename), 'utf-8')
    const sections = parseSections(raw)
    const title = filename.replace('.md', '')
    return { filename, title, content: raw, sections }
  })
}

/**
 * Parse markdown into sections based on headings.
 */
function parseSections(markdown) {
  const lines = markdown.split('\n')
  const sections = []
  let current = null

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/)
    if (headingMatch) {
      if (current) sections.push(current)
      current = { heading: headingMatch[2].trim(), level: headingMatch[1].length, content: '' }
    } else if (current) {
      current.content += line + '\n'
    }
  }
  if (current) sections.push(current)
  return sections
}

/**
 * Simple keyword-based search over the knowledge base.
 * Returns the most relevant sections for a given query.
 */
export function searchKnowledgeBase(query, kb, maxResults = 5) {
  const queryLower = query.toLowerCase()
  const keywords = queryLower
    .split(/\s+/)
    .filter(w => w.length > 2)
    .filter(w => !STOP_WORDS.has(w))

  const scored = []

  for (const doc of kb) {
    for (const section of doc.sections) {
      const text = (section.heading + ' ' + section.content).toLowerCase()
      let score = 0

      // Exact phrase match (highest weight)
      if (text.includes(queryLower)) score += 10

      // Keyword matches
      for (const kw of keywords) {
        const matches = (text.match(new RegExp(kw, 'gi')) || []).length
        score += matches * 2

        // Heading match bonus
        if (section.heading.toLowerCase().includes(kw)) score += 5
      }

      // Intent-based boosting
      if (queryLower.includes('cost') || queryLower.includes('price') || queryLower.includes('how much') || queryLower.includes('pricing')) {
        if (doc.filename === 'PRICING.md') score += 15
      }
      if (queryLower.includes('service') || queryLower.includes('what do you') || queryLower.includes('offer')) {
        if (doc.filename === 'SERVICES.md') score += 15
      }
      if (queryLower.includes('example') || queryLower.includes('case') || queryLower.includes('client') || queryLower.includes('result')) {
        if (doc.filename === 'CASE_STUDIES.md') score += 15
      }
      if (queryLower.includes('book') || queryLower.includes('call') || queryLower.includes('start') || queryLower.includes('get started')) {
        if (doc.filename === 'FAQ.md') score += 10
        if (doc.filename === 'SERVICES.md') score += 5
      }

      if (score > 0) {
        scored.push({
          source: doc.filename,
          heading: section.heading,
          content: section.content.trim(),
          score,
        })
      }
    }
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, maxResults)
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
  'and', 'but', 'or', 'nor', 'not', 'for', 'with', 'about', 'from',
  'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'to', 'of', 'in', 'on', 'at', 'by', 'up', 'out', 'off', 'over',
  'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
  'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'only', 'own', 'same', 'so',
  'than', 'too', 'very', 'just', 'because', 'as', 'until', 'while',
  'what', 'which', 'who', 'whom', 'your', 'you', 'our', 'its', 'my',
])
