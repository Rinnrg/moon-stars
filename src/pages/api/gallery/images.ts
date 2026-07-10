import type { APIRoute } from 'astro'
import { prisma } from '@/lib/prisma'
import { supabase, BUCKET } from '@/lib/supabase'
import sharp from 'sharp'

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

    console.log('[gallery/upload] file:', file?.name, file?.size, 'bytes')
    console.log('[gallery/upload] name:', name)

    if (!file || !name?.trim()) {
      return new Response(JSON.stringify({ error: 'File dan nama wajib diisi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Convert to WebP via sharp
    console.log('[gallery/upload] Converting to WebP...')
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const webpBuffer = await sharp(buffer).webp({ quality: 85 }).toBuffer()
    console.log('[gallery/upload] WebP size:', webpBuffer.length, 'bytes')

    const filename = `${Date.now()}-${name.trim().replace(/\s+/g, '-')}.webp`
    console.log('[gallery/upload] Uploading to Supabase bucket:', BUCKET, 'as', filename)

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filename, webpBuffer, {
        contentType: 'image/webp',
        upsert: false,
      })

    if (uploadError) {
      console.error('[gallery/upload] Supabase upload error:', uploadError)
      return new Response(
        JSON.stringify({ error: `Supabase error: ${uploadError.message}` }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('[gallery/upload] Supabase upload success')

    // Get public URL
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename)
    const publicUrl = urlData.publicUrl
    console.log('[gallery/upload] Public URL:', publicUrl)

    // Save to DB via Prisma
    console.log('[gallery/upload] Saving to DB...')
    const image = await prisma.galleryImage.create({
      data: { name: name.trim(), url: publicUrl },
    })
    console.log('[gallery/upload] Saved to DB, id:', image.id)

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
