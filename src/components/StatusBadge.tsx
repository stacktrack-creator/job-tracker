'use client'

import type { Status } from '@/types'
import clsx from 'clsx'

const CONFIG: Record<Status, { label: string; classes: string }> = {
  APPLIED: {
    label: 'Applied',
    classes: 'bg-blue-100 text-blue-800 ring-blue-200',
  },
  INTERVIEWING: {
    label: 'Interviewing',
    classes: 'bg-amber-100 text-amber-800 ring-amber-200',
  },
  OFFER: {
    label: 'Offer',
    classes: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  },
  REJECTED: {
    label: 'Rejected',
    classes: 'bg-red-100 text-red-800 ring-red-200',
  },
}

interface StatusBadgeProps {
  status: Status
  size?: 'sm' | 'md'
}

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const { label, classes } = CONFIG[status] || CONFIG.APPLIED
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full font-medium ring-1 ring-inset',
        classes,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      )}
    >
      {label}
    </span>
  )
}
