import QRCode from 'qrcode'
import {
  tool, getJSON, getBuffer, findMedia, download, convert, toSticker, addExif,
  gifToMp4, quotedText, REACTIONS
} from '../lib.js'

const anime = (name, url, pick) =>
  tool(name, async ({ sock, msg, from }) => {
    const u = pick(await getJSON(url))
    return sock.sendMessage(from, { image: { url: u }, caption: `🌸 ${name}` }, { quoted: msg })
  })

const FAV = ['happy', 'wave', 'dance', 'laugh', 'smile', 'blush', 'thumbsup', 'shrug', 'think', 'wink']

export default [
  tool('sticker', async ({ sock, msg, from, q, reply, config }) => {
    const media = findMedia(msg, from)
    if (!media || !['imageMessage', 'videoMessage', 'stickerMessage'].includes(media.type))
      return reply('📸 Réponds à une image, une vidéo (15 s max) ou un GIF avec *.sticker*\nOption : .sticker Pack | Auteur')
    if (media.size > 15e6) return reply('❌ Fichier trop lourd (15 Mo max).')
    if (media.type === 'videoMessage' && media.seconds > 15) return reply('❌ Vidéo trop longue (15 s max).')
    const [p, a] = q.split('|').map((x) => x.trim())
    const pack = p || config.botName
    const author = a ?? (msg.pushName || '')
    const buf = await download(sock, media.target)
    const out =
      media.type === 'stickerMessage'
        ? await addExif(buf, pack, author)
        : await toSticker(buf, media.type === 'videoMessage', pack, author)
    return sock.sendMessage(from, { sticker: out }, { quoted: msg })
  }),

  tool('take', async ({ sock, msg, from, q, reply, config }) => {
    const media = findMedia(msg, from)
    if (media?.type !== 'stickerMessage') return reply('Réponds à un sticker avec *.take Pack | Auteur*')
    const [p, a] = q.split('|').map((x) => x.trim())
    const buf = await download(sock, media.target)
    const out = await addExif(buf, p || config.botName, a ?? (msg.pushName || ''))
    return sock.sendMessage(from, { sticker: out }, { quoted: msg })
  }),

  tool('toimage', async ({ sock, msg, from, reply }) => {
    const media = findMedia(msg, from)
    if (media?.type !== 'stickerMessage') return reply('Réponds à un sticker avec *.toimage*')
    const buf = await download(sock, media.target)
    let png
    try { png = await convert(buf, 'png', []) } catch { throw new Error('Conversion impossible (les stickers animés ne sont pas pris en charge).') }
    return sock.sendMessage(from, { image: png, caption: '🖼️ Voilà !' }, { quoted: msg })
  }),

  tool('togif', async ({ sock, msg, from, reply }) => {
    const media = findMedia(msg, from)
    if (media?.type !== 'videoMessage') return reply('Réponds à une vidéo avec *.togif*')
    if (media.size > 15e6) return reply('❌ Vidéo trop lourde (15 Mo max).')
    const buf = await download(sock, media.target)
    return sock.sendMessage(from, { video: buf, gifPlayback: true, caption: '🎞️ GIF' }, { quoted: msg })
  }),

  tool('qr', async ({ sock, msg, from, q, reply }) => {
    const text = q || quotedText(msg)
    if (!text) return reply('Usage : .qr texte ou lien')
    const png = await QRCode.toBuffer(text.slice(0, 900), { width: 512, margin: 2 })
    return sock.sendMessage(from, { image: png, caption: '🔳 Voici ton QR code' }, { quoted: msg })
  }),

  tool('ssweb', async ({ sock, msg, from, args, reply }) => {
    let url = args[0]
    if (!url) return reply('Usage : .ssweb https://exemple.com')
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url
    if (!/^https?:\/\/[^\s/]+\.[^\s/]+/i.test(url)) return reply('❌ Lien invalide.')
    return sock.sendMessage(
      from,
      { image: { url: 'https://image.thum.io/get/width/1280/crop/900/' + url }, caption: `🖥️ ${url}` },
      { quoted: msg }
    )
  }),

  tool('meme', async ({ sock, msg, from }) => {
    for (let i = 0; i < 4; i++) {
      const d = await getJSON('https://meme-api.com/gimme')
      if (d.nsfw || d.spoiler || !d.url) continue
      return sock.sendMessage(from, { image: { url: d.url }, caption: `😂 ${d.title}\n📍 r/${d.subreddit}` }, { quoted: msg })
    }
    throw new Error('Aucun meme trouvé, réessaie.')
  }),

  anime('neko', 'https://nekos.best/api/v2/neko', (d) => d.results[0].url),
  anime('waifu', 'https://api.waifu.pics/sfw/waifu', (d) => d.url),
  anime('waifu2', 'https://nekos.best/api/v2/waifu', (d) => d.results[0].url),

  tool('gifreact', async ({ sock, msg, from, args, reply }) => {
    const action = (args[0] || '').toLowerCase() || FAV[Math.floor(Math.random() * FAV.length)]
    if (!REACTIONS.includes(action)) return reply(`Usage : .gifreact ${FAV.join(' / ')}\nAutres : ${REACTIONS.join(', ')}`)
    const r = (await getJSON(`https://nekos.best/api/v2/${action}`)).results?.[0]
    if (!r) throw new Error('Aucun GIF trouvé.')
    const mp4 = await gifToMp4(await getBuffer(r.url))
    return sock.sendMessage(
      from,
      { video: mp4, gifPlayback: true, caption: `🎭 ${action}${r.anime_name ? ' — ' + r.anime_name : ''}` },
      { quoted: msg }
    )
  })
]
