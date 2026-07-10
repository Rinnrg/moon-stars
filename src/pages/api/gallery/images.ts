import type { APIRoute } from 'astro'
import { prisma } from '@/lib/prisma'
import { supabase, BUCKET } from '@/lib/supabase'

export const prerender = false

export const POST: APIRoute = async ({ request }) => {
  console.log('[gallery/upload] POST request received')

  // ── Cek environment variables ──
  const supabaseUrl = import.meta.env.SUPABASE_URL
  const supabaseKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY
  console.log('[gallery/upload] SUPABASE_URL set:', !!supabaseUrl)
  console.log('[gallery/upload] SUPABASE_SERVICE_ROLE_KEY set:', !!supabaseKey)
  console.log('[gallery/upload] BUCKET:', BUCKET)

  if (!supabaseUrl || !supabaseKey) {
    console.error('[gallery/upload] ERROR: Environment variables tidak lengkap!')
    return new Response(
      JSON.stringify({ error: 'Server misconfigured: env vars missing' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const name = formData.get('name') as string | null

    console.log('[gallery/upload] file:', file?.name, file?.size, 'bytes', file?.type)
    console.log('[gallery/upload] name:', name)

    if (!file || !name?.trim()) {
      return new Response(JSON.stringify({ error: 'File dan nama wajib diisi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Upload langsung ke Supabase tanpa konversi (sharp dihapus karena native module issue di Vercel)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const filename = `${Date.now()}-${name.trim().replace(/\s+/g, '-')}.${ext}`
    const contentType = file.type || 'image/jpeg'

    console.log('[gallery/upload] Uploading:', filename, 'type:', contentType)

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filename, buffer, {
        contentType,
        upsert: false,
      })

    if (uploadError) {
      console.error('[gallery/upload] Supabase upload error:', JSON.stringify(uploadError))
      return new Response(
        JSON.stringify({ error: `Supabase error: ${uploadError.message}` }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('[gallery/upload] Upload success')

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename)
    const publicUrl = urlData.publicUrl
    console.log('[gallery/upload] Public URL:', publicUrl)

    console.log('[gallery/upload] Saving to DB...')
    const image = await prisma.galleryImage.create({
      data: { name: name.trim(), url: publicUrl },
    })
    console.log('[gallery/upload] Saved, id:', image.id)

    return new Response(JSON.stringify(image), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[gallery/upload] Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: 'Server error', detail: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export const GET: APIRoute = async () => {
  try {
    const images = await prisma.galleryImage.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return new Response(JSON.stringify(images), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[gallery/images] GET error:', err)
    return new Response(JSON.stringify({ error: 'Server error', detail: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
