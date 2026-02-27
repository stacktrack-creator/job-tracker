import axios from 'axios'
import * as cheerio from 'cheerio'
import type { ScrapedJob } from '@/types'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export async function scrapeJobPosting(url: string): Promise<Partial<ScrapedJob>> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        Connection: 'keep-alive',
      },
      timeout: 12000,
      maxRedirects: 5,
    })

    const $ = cheerio.load(response.data)

    // 1. Try JSON-LD structured data (most reliable — used by many modern job sites)
    const jsonLdResult = extractJsonLd($)
    if (jsonLdResult && (jsonLdResult.jobTitle || jsonLdResult.company)) {
      return jsonLdResult
    }

    // 2. Try site-specific selectors
    const siteResult = extractSiteSpecific($, url)
    if (siteResult && (siteResult.jobTitle || siteResult.company)) {
      // Fill any gaps with OpenGraph data
      const ogResult = extractOpenGraph($)
      return { ...ogResult, ...siteResult }
    }

    // 3. Fall back to OpenGraph + generic selectors
    const ogResult = extractOpenGraph($)
    const genericResult = extractGeneric($)
    return { ...ogResult, ...genericResult }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      if (status === 403 || status === 401) {
        throw new Error('This site requires authentication or blocks automated access.')
      }
      if (status === 404) {
        throw new Error('Job posting not found (404). The URL may be expired.')
      }
    }
    throw new Error('Failed to fetch the URL. The site may block scraping.')
  }
}

// ─── JSON-LD ────────────────────────────────────────────────────────────────

function extractJsonLd($: cheerio.CheerioAPI): Partial<ScrapedJob> | null {
  const scripts = $('script[type="application/ld+json"]')

  for (let i = 0; i < scripts.length; i++) {
    try {
      const raw = $(scripts[i]).html()
      if (!raw) continue
      const data = JSON.parse(raw)
      const schemas = Array.isArray(data) ? data : [data]

      for (const schema of schemas) {
        if (schema['@type'] === 'JobPosting') {
          return {
            jobTitle: schema.title || schema.name || '',
            company:
              schema.hiringOrganization?.name ||
              schema.hiringOrganization?.['@name'] ||
              '',
            location: parseJsonLdLocation(schema.jobLocation),
            jobDescription: stripHtml(schema.description || ''),
          }
        }
      }
    } catch {
      // malformed JSON — skip
    }
  }

  return null
}

function parseJsonLdLocation(jobLocation: unknown): string {
  if (!jobLocation) return ''
  const loc = Array.isArray(jobLocation) ? jobLocation[0] : jobLocation
  if (typeof loc === 'string') return loc
  if (typeof loc !== 'object' || loc === null) return ''

  const typedLoc = loc as Record<string, unknown>
  const address = typedLoc.address as Record<string, string> | undefined

  if (address) {
    return [address.addressLocality, address.addressRegion, address.addressCountry]
      .filter(Boolean)
      .join(', ')
  }

  return (typedLoc.name as string) || ''
}

// ─── Site-specific ──────────────────────────────────────────────────────────

function extractSiteSpecific($: cheerio.CheerioAPI, url: string): Partial<ScrapedJob> {
  const result: Partial<ScrapedJob> = {}

  if (url.includes('greenhouse.io')) {
    result.jobTitle =
      $('h1.app-title').text().trim() ||
      $('h1[class*="title"]').text().trim() ||
      $('h1').first().text().trim()
    result.company = $('.company-name').text().trim()
    result.location = $('.location').first().text().trim()
    result.jobDescription = stripHtml($('#content').html() || $('section.content').html() || '')
  } else if (url.includes('lever.co')) {
    result.jobTitle = $('h2').first().text().trim()
    result.company = $('img.main-header-logo').attr('alt') || ''
    result.location = $('.sort-by-time.posting-category').first().text().trim()
    result.jobDescription = stripHtml($('.posting-content section').html() || '')
  } else if (url.includes('workday.com')) {
    result.jobTitle = $('h2[data-automation-id="jobPostingHeader"]').text().trim()
    result.company = $('a[data-automation-id="companyName"]').text().trim()
    result.location = $('[data-automation-id="locations"]').text().trim()
    result.jobDescription = stripHtml($('[data-automation-id="jobPostingDescription"]').html() || '')
  } else if (url.includes('myworkdayjobs.com')) {
    result.jobTitle = $('[data-automation-id="jobPostingHeader"]').text().trim()
    result.location = $('[data-automation-id="locations"]').text().trim()
  } else if (url.includes('ashbyhq.com') || url.includes('jobs.ashbyhq.com')) {
    result.jobTitle = $('h1').first().text().trim()
    result.company = $('[class*="company"]').first().text().trim()
    result.location = $('[class*="location"]').first().text().trim()
    result.jobDescription = stripHtml($('[class*="description"]').html() || '')
  }

  return result
}

// ─── OpenGraph ──────────────────────────────────────────────────────────────

function extractOpenGraph($: cheerio.CheerioAPI): Partial<ScrapedJob> {
  const ogTitle =
    $('meta[property="og:title"]').attr('content') ||
    $('meta[name="twitter:title"]').attr('content') ||
    $('title').text().trim()

  const ogDesc =
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="description"]').attr('content') ||
    $('meta[name="twitter:description"]').attr('content')

  return {
    jobTitle: ogTitle || '',
    jobDescription: ogDesc || '',
  }
}

// ─── Generic fallback ───────────────────────────────────────────────────────

function extractGeneric($: cheerio.CheerioAPI): Partial<ScrapedJob> {
  const result: Partial<ScrapedJob> = {}

  // Job title — try h1, then page title
  const h1 = $('h1').first().text().trim()
  if (h1) result.jobTitle = h1

  // Location — look for common patterns
  const locationCandidates = [
    $('[class*="location"]').first().text().trim(),
    $('[data-testid*="location"]').first().text().trim(),
    $('[aria-label*="location"]').first().text().trim(),
  ].filter(Boolean)
  if (locationCandidates[0]) result.location = locationCandidates[0]

  // Company — look for logo alt or company-related elements
  const companyCandidates = [
    $('[class*="company-name"]').first().text().trim(),
    $('[class*="employer"]').first().text().trim(),
    $('[class*="org-name"]').first().text().trim(),
    $('img[class*="logo"]').attr('alt') || '',
  ].filter(Boolean)
  if (companyCandidates[0]) result.company = companyCandidates[0]

  // Job description — look for large content blocks
  const descSelectors = [
    '[class*="job-description"]',
    '[class*="jobDescription"]',
    '[class*="description"]',
    '[class*="job-details"]',
    '[class*="posting-content"]',
    'article',
    'main',
  ]
  for (const selector of descSelectors) {
    const el = $(selector).first()
    const text = el.text().trim()
    if (el.length && text.length > 200) {
      result.jobDescription = stripHtml(el.html() || '')
      break
    }
  }

  return result
}

// ─── HTML → plain text ──────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
