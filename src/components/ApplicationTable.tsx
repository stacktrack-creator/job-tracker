'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import type { Application } from '@/types'
import StatusBadge from './StatusBadge'

interface ApplicationTableProps {
  applications: Application[]
  onDelete: (id: string) => void
}

export default function ApplicationTable({ applications, onDelete }: ApplicationTableProps) {
  if (applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white py-16 text-center">
        <svg
          className="mb-4 h-12 w-12 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="text-base font-medium text-gray-500">No applications found</p>
        <p className="mt-1 text-sm text-gray-400">Add your first application to get started.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Desktop table */}
      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Job Title</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Company</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Location</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Date Applied</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {applications.map((app) => (
              <tr
                key={app.id}
                className="group transition-colors hover:bg-gray-50/80"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/applications/${app.id}`}
                    className="font-medium text-gray-900 hover:text-indigo-600 hover:underline"
                  >
                    {app.jobTitle}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{app.company}</td>
                <td className="px-4 py-3 text-gray-500">
                  {app.location || <span className="italic text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {format(new Date(app.dateApplied), 'MMM d, yyyy')}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={app.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 transition group-hover:opacity-100">
                    <Link
                      href={`/applications/${app.id}`}
                      className="rounded-md px-2.5 py-1 text-xs font-medium text-indigo-600 ring-1 ring-inset ring-indigo-200 hover:bg-indigo-50"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => onDelete(app.id)}
                      className="rounded-md px-2.5 py-1 text-xs font-medium text-red-600 ring-1 ring-inset ring-red-200 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="divide-y divide-gray-100 md:hidden">
        {applications.map((app) => (
          <li key={app.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/applications/${app.id}`}
                  className="block truncate font-semibold text-gray-900 hover:text-indigo-600"
                >
                  {app.jobTitle}
                </Link>
                <p className="mt-0.5 truncate text-sm text-gray-500">
                  {app.company}
                  {app.location && ` · ${app.location}`}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {format(new Date(app.dateApplied), 'MMM d, yyyy')}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={app.status} />
                <button
                  onClick={() => onDelete(app.id)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
