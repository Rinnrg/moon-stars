import type { APIRoute } from 'astro'
import fs from 'node:fs/promises'
import path from 'node:path'
import { supabase } from '@/lib/supabase'

export const prerender = false

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData()
    
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const tagsStr = formData.get('tags') as string
    const content = formData.get('content') as string
    const image = formData.get('image') as File | null

    if (!title || !description || !content) {
      return new Response(JSON.stringify({ error: 'Judul, deskripsi, dan konten wajib diisi.' }), {
        status: 400,
      })
    }

    // Buat slug dari title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    // Tentukan path direktori
    const baseDir = path.join(process.cwd(), 'src', 'content', 'blog', slug)

    // Cek apakah blog sudah ada
    try {
      await fs.access(baseDir)
      return new Response(JSON.stringify({ error: 'Blog dengan judul ini (slug sama) sudah ada.' }), { status: 400 })
    } catch {
      // Aman, belum ada
    }

    // Buat direktori base untuk blog
    await fs.mkdir(baseDir, { recursive: true })

    // Proses gambar (jika ada) ke Supabase
    let imageUrl = ''
    if (image && image.size > 0) {
      const ext = image.name.split('.').pop() || 'png'
      const fileName = `blog-${slug}-${Date.now()}.${ext}`
      
      const arrayBuffer = await image.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      const { error: uploadError } = await supabase.storage
        .from('gallery')
        .upload(fileName, buffer, {
          contentType: image.type,
          upsert: true,
        })

      if (uploadError) {
        throw new Error('Gagal mengunggah gambar ke Supabase: ' + uploadError.message)
      }

      const { data: publicUrlData } = supabase.storage
        .from('gallery')
        .getPublicUrl(fileName)
        
      imageUrl = publicUrlData.publicUrl
    }

    // Siapkan tags array
    const tags = tagsStr 
      ? tagsStr.split(',').map(t => `'${t.trim().toLowerCase()}'`).join(', ')
      : ''

    // Ambil tanggal hari ini format YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0]

    // Bangun frontmatter (MDX)
    const mdxContent = `---
title: '${title.replace(/'/g, "''")}'
description: '${description.replace(/'/g, "''")}'
date: ${today}
${tags ? `tags: [${tags}]` : ''}
${imageUrl ? `imageWithText: '${imageUrl}'` : ''}
${imageUrl ? `imageWithoutText: '${imageUrl}'` : ''}
authors: ['enscribe']
---

${content}
`

    // Simpan index.mdx
    await fs.writeFile(path.join(baseDir, 'index.mdx'), mdxContent)

    return new Response(JSON.stringify({ success: true, slug }), { status: 201 })
  } catch (error: any) {
    console.error('[Blog Create API]', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}
