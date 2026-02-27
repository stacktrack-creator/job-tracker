import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET /api/applications — list all applications with optional filtering/sorting
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const sort = searchParams.get('sort') || 'dateApplied'
    const order = searchParams.get('order') || 'desc'
    const search = searchParams.get('search') || ''

    const where: Record<string, unknown> = {}

    if (status && status !== 'ALL') {
      where.status = status
    }

    if (search) {
      where.OR = [
        { jobTitle: { contains: search } },
        { company: { contains: search } },
        { location: { contains: search } },
      ]
    }

    const validSortFields = ['dateApplied', 'createdAt', 'company', 'jobTitle', 'status']
    const sortField = validSortFields.includes(sort) ? sort : 'dateApplied'
    const sortOrder = order === 'asc' ? 'asc' : 'desc'

    const applications = await prisma.application.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
    })

    return NextResponse.json(applications)
  } catch (error) {
    console.error('GET /api/applications error:', error)
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 })
  }
}

// POST /api/applications — create a new application
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { jobTitle, company, location, jobDescription, dateApplied, status, notes, sourceUrl } =
      body

    if (!jobTitle?.trim()) {
      return NextResponse.json({ error: 'Job title is required' }, { status: 400 })
    }
    if (!company?.trim()) {
      return NextResponse.json({ error: 'Company is required' }, { status: 400 })
    }

    const validStatuses = ['APPLIED', 'INTERVIEWING', 'OFFER', 'REJECTED']
    const safeStatus = validStatuses.includes(status) ? status : 'APPLIED'

    const application = await prisma.application.create({
      data: {
        jobTitle: jobTitle.trim(),
        company: company.trim(),
        location: (location || '').trim(),
        jobDescription: (jobDescription || '').trim(),
        dateApplied: dateApplied ? new Date(dateApplied) : new Date(),
        status: safeStatus,
        notes: (notes || '').trim(),
        sourceUrl: sourceUrl?.trim() || null,
      },
    })

    return NextResponse.json(application, { status: 201 })
  } catch (error) {
    console.error('POST /api/applications error:', error)
    return NextResponse.json({ error: 'Failed to create application' }, { status: 500 })
  }
}
