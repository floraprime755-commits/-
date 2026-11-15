import { tool, findMedia, download } from '../lib.js'

const ext = (mt) => (mt.split('/')[1] || 'bin').split(';')[0]

async function catbox(buf, name) {
  const form = new FormData()
  form.append('reqtype', 'fileupload')
  form.append('fileToUpload', new Blob([buf]), name)
  const res = await fetch('https://catbox.moe/user/api.php', { method: 'POST', body: form, signal: AbortSignal.timeout(60000) })
  const t = (await res.text()).trim()
  if (!t.startsWith('http')) throw new Error('Catbox : ' + (t.slice(0, 80) || 'échec'))
  return t
}

async function uguu(buf, name) {
  const form = new FormData()
  form.append('files[]', new Blob([buf]), name)
  const res = await fetch('https://uguu.se/upload', { method: 'POST', body: form, signal: AbortSignal.timeout(60000) })
  const url = (await res.json()).files?.[0]?.url
  if (!url) throw new Error('Uguu : échec')
  return url
}

async function file({ sock, msg, from, reply }) {
  const m = findMedia(msg, from)
  if (!m) { await reply('📎 Réponds à une image, une vidéo, un audio ou un document.'); return null }
  if (m.size > 30e6) { await reply('❌ Fichier trop lourd (30 Mo max).'); return null }
  return { buf: await download(sock, m.target), name: `eldorado.${ext(m.mimetype)}` }
}

export default [
  tool('catbox', async (ctx) => {
    const f = await file(ctx)
    if (f) return ctx.reply(`✅ Catbox (permanent)\n🔗 ${await catbox(f.buf, f.name)}`)
  }, { owner: true }),

  tool('uguu', async (ctx) => {
    const f = await file(ctx)
    if (f) return ctx.reply(`✅ Uguu (temporaire, ~3 h)\n🔗 ${await uguu(f.buf, f.name)}`)
  }, { owner: true }),

  tool('upload', async (ctx) => {
    const f = await file(ctx)
    if (!f) return
    let url
    try { url = await catbox(f.buf, f.name) } catch { url = await uguu(f.buf, f.name) }
    return ctx.reply(`✅ Fichier envoyé\n🔗 ${url}`)
  }, { owner: true })
]
