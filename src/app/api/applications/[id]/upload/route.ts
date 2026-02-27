import { NextRequest, NextResponse } from 'next/server'
import { writeFile, unlink, mkdir } from 'fs/promises'
import path from 'path'
import prisma from '@/lib/prisma'

type Params = { params: { id: string } }

const UPLOAD_DIR = path.join(process.cwd(), 'uploads')
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const application = await prisma.application.findUnique({
      where: { id: params.id },
    })
    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const fileType = formData.get('type') as string | null // 'resume' | 'coverLetter'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    if (!['resume', 'coverLetter'].includes(fileType || '')) {
      return NextResponse.json({ error: 'Invalid file type. Use "resume" or "coverLetter"' }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Max 10 MB.' }, { status: 400 })
    }
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are accepted.' }, { status: 400 })
    }

    // Ensure uploads directory exists
    await mkdir(UPLOAD_DIR, { recursive: true })

    // Delete the old file if replacing
    const oldFilename =
      fileType === 'resume' ? application.resumePath : application.coverLetterPath
    if (oldFilename) {
      try {
        await unlink(path.join(UPLOAD_DIR, oldFilename))
      } catch {
        // Old file might not exist
      }
    }

    // Sanitise the original filename
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filename = `${params.id}_${fileType}_${Date.now()}_${safeName}`
    const filepath = path.join(UPLOAD_DIR, filename)

    const bytes = await file.arrayBuffer()
    await writeFile(filepath, Buffer.from(bytes))

    // Update DB
    const updateData =
      fileType === 'resume' ? { resumePath: filename } : { coverLetterPath: filename }

    const updated = await prisma.application.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json({ success: true, filename, application: updated })
  } catch (error) {
    console.error('POST /api/applications/[id]/upload error:', error)
    return NextResponse.json({ error: 'File upload failed' }, { status: 500 })
  }
}

// DELETE /api/applications/[id]/upload?type=resume|coverLetter
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { searchParams } = new URL(request.url)
    const fileType = searchParams.get('type')

    if (!['resume', 'coverLetter'].includes(fileType || '')) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    const application = await prisma.application.findUnique({
      where: { id: params.id },
    })
    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    const filename =
      fileType === 'resume' ? application.resumePath : application.coverLetterPath

    if (filename) {
      try {
        await unlink(path.join(UPLOAD_DIR, filename))
      } catch {
        // File might already be missing
      }
    }

    const updateData =
      fileType === 'resume' ? { resumePath: null } : { coverLetterPath: null }

    const updated = await prisma.application.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json({ success: true, application: updated })
  } catch (error) {
    console.error('DELETE /api/applications/[id]/upload error:', error)
    return NextResponse.json({ error: 'Failed to remove file' }, { status: 500 })
  }
}
