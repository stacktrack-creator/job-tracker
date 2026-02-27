'use client'

import type { ApplicationStats } from '@/types'

interface StatCardProps {
  label: string
  value: number
  color: string
  bg: string
}

function StatCard({ label, value, color, bg }: StatCardProps) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <span className={`h-2.5 w-2.5 rounded-full ${bg}`} />
      </div>
      <p className={`mt-2 text-3xl font-bold tracking-tight ${color}`}>{value}</p>
    </div>
  )
}

export default function SummaryStats({ stats }: { stats: ApplicationStats }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <StatCard label="Total" value={stats.total} color="text-gray-900" bg="bg-gray-400" />
      <StatCard label="Applied" value={stats.applied} color="text-blue-700" bg="bg-blue-400" />
      <StatCard
        label="Interviewing"
        value={stats.interviewing}
        color="text-amber-700"
        bg="bg-amber-400"
      />
      <StatCard label="Offers" value={stats.offer} color="text-emerald-700" bg="bg-emerald-400" />
      <StatCard label="Rejected" value={stats.rejected} color="text-red-700" bg="bg-red-400" />
    </div>
  )
}
