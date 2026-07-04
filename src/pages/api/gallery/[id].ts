import type { APIRoute } from 'astro'
import { prisma } from '@/lib/prisma'
import { supabase, BUCKET } from '@/lib/supabase'

export const prerender = false

export const DELETE: APIRoute = async ({ params }) => {
  try {
    const { id } = params
    if (!id) return new Response(JSON.stringify({ error: 'ID wajib' }), { status: 400 })

    const image = await prisma.galleryImage.findUnique({ where: { id } })
    if (!image) return new Response(JSON.stringify({ error: 'Tidak ditemukan' }), { status: 404 })

    // Extract filename from URL and delete from storage
    const filename = image.url.split('/').pop()
    if (filename) {
      await supabase.storage.from(BUCKET).remove([filename])
    }

    await prisma.galleryImage.delete({ where: { id } })

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[gallery/delete]', err)
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 })
  }
}
