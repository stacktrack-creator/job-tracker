export type Status = 'APPLIED' | 'INTERVIEWING' | 'OFFER' | 'REJECTED'

export interface Application {
  id: string
  jobTitle: string
  company: string
  location: string
  jobDescription: string
  dateApplied: string
  status: Status
  notes: string
  resumePath: string | null
  coverLetterPath: string | null
  sourceUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface ApplicationStats {
  total: number
  applied: number
  interviewing: number
  offer: number
  rejected: number
}

export interface ScrapedJob {
  jobTitle: string
  company: string
  location: string
  jobDescription: string
}
