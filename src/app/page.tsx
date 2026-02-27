'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Application, ApplicationStats } from '@/types'
import SummaryStats from '@/components/SummaryStats'
import FilterBar from '@/components/FilterBar'
import ApplicationTable from '@/components/ApplicationTable'
import AddApplicationModal from '@/components/AddApplicationModal'

export default function DashboardPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sortField, setSortField] = useState('dateApplied')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Confirm delete
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const fetchApplications = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        sort: sortField,
        order: sortOrder,
        ...(statusFilter !== 'ALL' && { status: statusFilter }),
        ...(search && { search }),
      })
      const res = await fetch(`/api/applications?${params}`)
      const data = await res.json()
      setApplications(Array.isArray(data) ? data : [])
    } catch {
      setApplications([])
    } finally {
      setLoading(false)
    }
  }, [sortField, sortOrder, statusFilter, search])

  useEffect(() => {
    fetchApplications()
  }, [fetchApplications])

  const stats = useMemo<ApplicationStats>(() => {
    // Stats are always computed over ALL applications (not filtered)
    // We re-fetch them separately or derive from local list
    const all = applications
    return {
      total: all.length,
      applied: all.filter((a) => a.status === 'APPLIED').length,
      interviewing: all.filter((a) => a.status === 'INTERVIEWING').length,
      offer: all.filter((a) => a.status === 'OFFER').length,
      rejected: all.filter((a) => a.status === 'REJECTED').length,
    }
  }, [applications])

  // Fetch all apps without filters for stats when filtered view is active
  const [allStats, setAllStats] = useState<ApplicationStats | null>(null)
  const isFiltered = statusFilter !== 'ALL' || search.trim() !== ''

  useEffect(() => {
    if (!isFiltered) {
      setAllStats(null)
      return
    }
    fetch('/api/applications')
      .then((r) => r.json())
      .then((data: Application[]) => {
        if (!Array.isArray(data)) return
        setAllStats({
          total: data.length,
          applied: data.filter((a) => a.status === 'APPLIED').length,
          interviewing: data.filter((a) => a.status === 'INTERVIEWING').length,
          offer: data.filter((a) => a.status === 'OFFER').length,
          rejected: data.filter((a) => a.status === 'REJECTED').length,
        })
      })
      .catch(() => {})
  }, [isFiltered])

  const displayedStats = allStats ?? stats

  async function handleDelete(id: string) {
    setDeleteTarget(id)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await fetch(`/api/applications/${deleteTarget}`, { method: 'DELETE' })
      await fetchApplications()
    } catch {
      alert('Failed to delete application.')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <>
      <div className="space-y-6">
        {/* Page heading */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            {displayedStats.total} application{displayedStats.total !== 1 ? 's' : ''} tracked
          </p>
        </div>

        {/* Summary stats */}
        <SummaryStats stats={displayedStats} />

        {/* Filters + Add button */}
        <FilterBar
          search={search}
          statusFilter={statusFilter}
          sortField={sortField}
          sortOrder={sortOrder}
          onSearchChange={setSearch}
          onStatusChange={setStatusFilter}
          onSortChange={(f, o) => { setSortField(f); setSortOrder(o) }}
          onAddClick={() => setShowModal(true)}
        />

        {/* Applications list */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-200" />
            ))}
          </div>
        ) : (
          <ApplicationTable applications={applications} onDelete={handleDelete} />
        )}
      </div>

      {/* Add Application Modal */}
      {showModal && (
        <AddApplicationModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false)
            fetchApplications()
          }}
        />
      )}

      {/* Delete Confirm Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-900">Delete Application</h3>
            <p className="mt-1 text-sm text-gray-500">
              This will permanently delete the application and any uploaded files. This cannot be undone.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
