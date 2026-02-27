import { NextRequest, NextResponse } from 'next/server'
import { unlink } from 'fs/promises'
import path from 'path'
import prisma from '@/lib/prisma'

type Params = { params: { id: string } }

// GET /api/applications/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const application = await prisma.application.findUnique({
      where: { id: params.id },
    })
    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }
    return NextResponse.json(application)
  } catch (error) {
    console.error('GET /api/applications/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch application' }, { status: 500 })
  }
}

// PUT /api/applications/[id]
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const body = await request.json()
    const { jobTitle, company, location, jobDescription, dateApplied, status, notes, sourceUrl } =
      body

    const validStatuses = ['APPLIED', 'INTERVIEWING', 'OFFER', 'REJECTED']

    const application = await prisma.application.update({
      where: { id: params.id },
      data: {
        ...(jobTitle !== undefined && { jobTitle: jobTitle.trim() }),
        ...(company !== undefined && { company: company.trim() }),
        ...(location !== undefined && { location: location.trim() }),
        ...(jobDescription !== undefined && { jobDescription: jobDescription.trim() }),
        ...(dateApplied !== undefined && { dateApplied: new Date(dateApplied) }),
        ...(status !== undefined &&
          validStatuses.includes(status) && { status }),
        ...(notes !== undefined && { notes: notes.trim() }),
        ...(sourceUrl !== undefined && { sourceUrl: sourceUrl?.trim() || null }),
      },
    })

    return NextResponse.json(application)
  } catch (error) {
    console.error('PUT /api/applications/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 })
  }
}

// DELETE /api/applications/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const application = await prisma.application.findUnique({
      where: { id: params.id },
    })
    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Clean up uploaded files
    const filesToDelete = [application.resumePath, application.coverLetterPath].filter(Boolean)
    for (const filename of filesToDelete) {
      try {
        await unlink(path.join(process.cwd(), 'uploads', filename!))
      } catch {
        // File might not exist — ignore
      }
    }

    await prisma.application.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/applications/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete application' }, { status: 500 })
  }
}
