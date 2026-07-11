import type { APIRoute } from 'astro'
import { prisma } from '@/lib/prisma'
import { supabase } from '@/lib/supabase'

export const prerender = false

const BUCKET = 'songs'

export const DELETE: APIRoute = async ({ params }) => {
  try {
    const { id } = params
    if (!id) return new Response(JSON.stringify({ error: 'ID wajib' }), { status: 400 })

    const song = await prisma.song.findUnique({ where: { id } })
    if (!song) return new Response(JSON.stringify({ error: 'Tidak ditemukan' }), { status: 404 })

    // Hapus dari Supabase Storage
    const filename = song.imageUrl.split('/').pop()
    if (filename) {
      await supabase.storage.from(BUCKET).remove([filename])
    }

    await prisma.song.delete({ where: { id } })

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[songs/delete]', err)
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 })
  }
}
