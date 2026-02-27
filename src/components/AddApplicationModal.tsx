'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import type { Status } from '@/types'

interface FormData {
  sourceUrl: string
  jobTitle: string
  company: string
  location: string
  jobDescription: string
  dateApplied: string
  status: Status
  notes: string
}

const DEFAULT_FORM: FormData = {
  sourceUrl: '',
  jobTitle: '',
  company: '',
  location: '',
  jobDescription: '',
  dateApplied: format(new Date(), 'yyyy-MM-dd'),
  status: 'APPLIED',
  notes: '',
}

interface AddApplicationModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function AddApplicationModal({ onClose, onSuccess }: AddApplicationModalProps) {
  const [form, setForm] = useState<FormData>(DEFAULT_FORM)
  const [scraping, setScraping] = useState(false)
  const [scrapeError, setScrapeError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<FormData>>({})

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  async function handleScrape() {
    if (!form.sourceUrl.trim()) return
    setScraping(true)
    setScrapeError('')
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: form.sourceUrl.trim() }),
      })
      const json = await res.json()
      if (!res.ok) {
        setScrapeError(json.error || 'Scraping failed')
        return
      }
      const { data } = json
      setForm((prev) => ({
        ...prev,
        jobTitle: data.jobTitle || prev.jobTitle,
        company: data.company || prev.company,
        location: data.location || prev.location,
        jobDescription: data.jobDescription || prev.jobDescription,
      }))
    } catch {
      setScrapeError('Network error. Check the URL and try again.')
    } finally {
      setScraping(false)
    }
  }

  function validate(): boolean {
    const newErrors: Partial<FormData> = {}
    if (!form.jobTitle.trim()) newErrors.jobTitle = 'Job title is required'
    if (!form.company.trim()) newErrors.company = 'Company is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const json = await res.json()
        setErrors({ jobTitle: json.error })
        return
      }
      onSuccess()
    } catch {
      setErrors({ jobTitle: 'Failed to save. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Add Application</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* URL scraper */}
          <div className="rounded-xl bg-indigo-50 p-4">
            <label className="mb-1.5 block text-sm font-medium text-indigo-900">
              Auto-fill from URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://jobs.example.com/posting/123"
                value={form.sourceUrl}
                onChange={(e) => setField('sourceUrl', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleScrape())}
                className="flex-1 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={handleScrape}
                disabled={scraping || !form.sourceUrl.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
              >
                {scraping ? (
                  <>
                    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Fetching…
                  </>
                ) : (
                  'Fetch Details'
                )}
              </button>
            </div>
            {scrapeError && (
              <p className="mt-1.5 text-xs text-red-600">{scrapeError}</p>
            )}
            <p className="mt-1.5 text-xs text-indigo-700/70">
              Paste a job posting URL to auto-fill the fields below. Works best with Greenhouse, Lever, and sites with structured data.
            </p>
          </div>

          {/* Job title + Company */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Job Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.jobTitle}
                onChange={(e) => setField('jobTitle', e.target.value)}
                placeholder="Software Engineer"
                className={`w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 ${
                  errors.jobTitle
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                }`}
              />
              {errors.jobTitle && (
                <p className="mt-1 text-xs text-red-600">{errors.jobTitle}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Company <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.company}
                onChange={(e) => setField('company', e.target.value)}
                placeholder="Acme Corp"
                className={`w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 ${
                  errors.company
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                }`}
              />
              {errors.company && (
                <p className="mt-1 text-xs text-red-600">{errors.company}</p>
              )}
            </div>
          </div>

          {/* Location + Date + Status */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Location</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setField('location', e.target.value)}
                placeholder="San Francisco, CA"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Date Applied</label>
              <input
                type="date"
                value={form.dateApplied}
                onChange={(e) => setField('dateApplied', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
              <select
                value={form.status}
                onChange={(e) => setField('status', e.target.value as Status)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="APPLIED">Applied</option>
                <option value="INTERVIEWING">Interviewing</option>
                <option value="OFFER">Offer</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          {/* Job Description */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Job Description</label>
            <textarea
              value={form.jobDescription}
              onChange={(e) => setField('jobDescription', e.target.value)}
              rows={6}
              placeholder="Paste the job description here…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              rows={3}
              placeholder="Any notes about this application…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-60 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {submitting && (
                <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              Save Application
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
