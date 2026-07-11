import type { APIRoute } from 'astro'
import { prisma } from '@/lib/prisma'
import { supabase } from '@/lib/supabase'
import sharp from 'sharp'

export const prerender = false

const BUCKET = 'songs'

export const GET: APIRoute = async () => {
  try {
    const songs = await prisma.song.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return new Response(JSON.stringify(songs), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[songs] GET error:', err)
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 })
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData()
    const file    = formData.get('image') as File | null
    const title   = formData.get('title') as string | null
    const artist  = formData.get('artist') as string | null
    const description = (formData.get('description') as string | null) ?? ''

    if (!file || !title?.trim() || !artist?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Gambar, judul, dan artis wajib diisi' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Konversi ke WebP via sharp
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const webpBuffer = await sharp(buffer).webp({ quality: 85 }).toBuffer()

    const filename = `${Date.now()}-${title.trim().replace(/\s+/g, '-')}.webp`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filename, webpBuffer, { contentType: 'image/webp', upsert: false })

    if (uploadError) {
      console.error('[songs] Supabase error:', uploadError)
      return new Response(
        JSON.stringify({ error: `Supabase: ${uploadError.message}` }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename)

    const song = await prisma.song.create({
      data: {
        title: title.trim(),
        artist: artist.trim(),
        description: description.trim(),
        imageUrl: urlData.publicUrl,
      },
    })

    return new Response(JSON.stringify(song), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[songs] POST error:', err)
    return new Response(
      JSON.stringify({ error: 'Server error', detail: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
