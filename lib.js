import { execFile } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import pino from 'pino'
import webp from 'node-webpmux'
import { downloadMediaMessage } from '@whiskeysockets/baileys'

const UA = { 'User-Agent': 'Mozilla/5.0 (Linux; Android 13) EldoradoBot' }

async function http(url, ms = 12000) {
  const res = await fetch(url, { signal: AbortSignal.timeout(ms), headers: UA })
  if (!res.ok) throw new Error('HTTP ' + res.status)
  return res
}
export const getJSON = async (url) => (await http(url)).json()
export const getText = async (url) => (await http(url)).text()
export const getBuffer = async (url) => Buffer.from(await (await http(url, 25000)).arrayBuffer())

// Enveloppe : les erreurs réseau ne plantent pas le bot
export const tool = (name, fn, extra = {}) => ({
  name,
  ...extra,
  async run(ctx) {
    try {
      return await fn(ctx)
    } catch (e) {
      const net = /fetch failed|timeout|aborted|HTTP \d+/i.test(e.message)
      return ctx.reply(net ? '⚠️ Service indisponible pour le moment, réessaie plus tard.' : `⚠️ ${e.message}`)
    }
  }
})

export async function translate(text, lang = 'fr') {
  const d = await getJSON(
    'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=' +
    encodeURIComponent(lang) + '&dt=t&q=' + encodeURIComponent(text)
  )
  return { text: d[0].map((x) => x[0]).join(''), from: d[2] }
}

export const quotedText = (msg) => {
  const c = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
  return c?.conversation || c?.extendedTextMessage?.text || ''
}

// Média du message ou du message cité
const TYPES = ['imageMessage', 'videoMessage', 'stickerMessage', 'audioMessage', 'documentMessage']
export function findMedia(msg, from) {
  const pick = (box, target) => {
    for (const type of TYPES) {
      const node = box?.[type]
      if (node)
        return {
          type, node, target,
          size: Number(node.fileLength?.toNumber?.() ?? node.fileLength ?? 0),
          seconds: node.seconds || 0,
          mimetype: node.mimetype || ''
        }
    }
    return null
  }
  const direct = pick(msg.message, msg)
  if (direct) return direct
  const ctx = msg.message?.extendedTextMessage?.contextInfo
  if (!ctx?.quotedMessage) return null
  return pick(ctx.quotedMessage, {
    key: { remoteJid: from, id: ctx.stanzaId, participant: ctx.participant },
    message: ctx.quotedMessage
  })
}

export const download = (sock, target) =>
  downloadMediaMessage(target, 'buffer', {}, {
    logger: pino({ level: 'silent' }),
    reuploadRequest: sock.updateMediaMessage
  })

function ffmpeg(args) {
  return new Promise((resolve, reject) => {
    execFile('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args], { timeout: 90000 }, (err, _o, stderr) => {
      if (!err) return resolve()
      if (err.code === 'ENOENT') return reject(new Error("ffmpeg n'est pas installé : pkg install ffmpeg"))
      reject(new Error('Conversion impossible : ' + String(stderr || err.message).split('\n')[0].slice(0, 120)))
    })
  })
}

export async function convert(buffer, outExt, args) {
  const id = Date.now() + '-' + Math.random().toString(36).slice(2, 8)
  const inp = path.join(os.tmpdir(), `eld-${id}.bin`)
  const out = path.join(os.tmpdir(), `eld-${id}.${outExt}`)
  fs.writeFileSync(inp, buffer)
  try {
    await ffmpeg(['-i', inp, ...args, out])
    return fs.readFileSync(out)
  } finally {
    fs.rmSync(inp, { force: true })
    fs.rmSync(out, { force: true })
  }
}

// Nom du pack et auteur dans le sticker
export async function addExif(buffer, pack, author) {
  const img = new webp.Image()
  await img.load(buffer)
  const head = Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00])
  const body = Buffer.from(JSON.stringify({
    'sticker-pack-id': 'eldorado-' + Date.now(),
    'sticker-pack-name': pack,
    'sticker-pack-publisher': author,
    emojis: ['']
  }), 'utf8')
  const exif = Buffer.concat([head, body])
  exif.writeUIntLE(body.length, 14, 4)
  img.exif = exif
  return img.save(null)
}

export async function toSticker(buffer, isVideo, pack, author) {
  const vf = 'scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000'
  const args = isVideo
    ? ['-t', '6', '-vf', `fps=10,${vf}`, '-loop', '0', '-an', '-vcodec', 'libwebp', '-lossless', '0', '-q:v', '30', '-compression_level', '6']
    : ['-vf', vf, '-vcodec', 'libwebp', '-lossless', '0', '-q:v', '70', '-compression_level', '6']
  return addExif(await convert(buffer, 'webp', args), pack, author)
}

export const gifToMp4 = (buf) =>
  convert(buf, 'mp4', ['-movflags', 'faststart', '-pix_fmt', 'yuv420p', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-an'])

// Actions de réaction (nekos.best)
export const REACTIONS = [
  'baka', 'bite', 'blush', 'bored', 'cry', 'cuddle', 'dance', 'facepalm', 'feed', 'handhold',
  'handshake', 'happy', 'highfive', 'hug', 'kick', 'kiss', 'laugh', 'lurk', 'nod', 'nom', 'nope',
  'pat', 'peck', 'poke', 'pout', 'punch', 'run', 'shoot', 'shrug', 'slap', 'sleep', 'smile',
  'smug', 'stare', 'think', 'thumbsup', 'tickle', 'wave', 'wink', 'yawn', 'yeet'
]
