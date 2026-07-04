import type { APIRoute } from 'astro'
import { prisma } from '@/lib/prisma'
import { supabase, BUCKET } from '@/lib/supabase'
import sharp from 'sharp'

export const prerender = false

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const name = formData.get('name') as string | null

    if (!file || !name?.trim()) {
      return new Response(JSON.stringify({ error: 'File dan nama wajib diisi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Convert to WebP via sharp
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const webpBuffer = await sharp(buffer)
      .webp({ quality: 85 })
      .toBuffer()

    const filename = `${Date.now()}-${name.trim().replace(/\s+/g, '-')}.webp`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filename, webpBuffer, {
        contentType: 'image/webp',
        upsert: false,
      })

    if (uploadError) {
      return new Response(JSON.stringify({ error: uploadError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(filename)

    const publicUrl = urlData.publicUrl

    // Save to DB via Prisma
    const image = await prisma.galleryImage.create({
      data: {
        name: name.trim(),
        url: publicUrl,
      },
    })

    return new Response(JSON.stringify(image), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[gallery/upload]', err)
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
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
    console.error('[gallery/images]', err)
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
