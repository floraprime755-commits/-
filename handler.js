import { reportError } from './notify.js'
import fs from 'fs'
import config from './config.js'
import * as db from './db.js'
import { num } from './utils.js'
import { inspect } from './security.js'

export const commands = new Map()

export async function loadCommands() {
  commands.clear()
  const dir = new URL('./commands/', import.meta.url)
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
    try {
      const mod = (await import(`./commands/${file}`)).default
      for (const c of [].concat(mod)) commands.set(c.name, c)
    } catch (e) {
      console.log(`❌ Échec du chargement de ${file} :`, e.message)
    }
  }
  console.log(`📦 ${commands.size} commandes :`, [...commands.keys()].join(', '))
}

function unwrap(m) {
  return (
    m?.ephemeralMessage?.message ||
    m?.viewOnceMessage?.message ||
    m?.viewOnceMessageV2?.message ||
    m?.documentWithCaptionMessage?.message ||
    m
  )
}

const EMOJIS = ['❤️', '🔥', '👍', '😂', '😮', '🙏', '🎉']

export async function handleMessage(sock, msg) {
  if (!msg.message) return
  msg.message = unwrap(msg.message)

  const from = msg.key.remoteJid
  if (from === 'status@broadcast') return

  const text =
    msg.message.conversation ||
    msg.message.extendedTextMessage?.text ||
    msg.message.imageMessage?.caption ||
    msg.message.videoMessage?.caption ||
    ''

  const sender = msg.key.participant || from
  const number = num(sender)
  const isOwner =
    msg.key.fromMe ||
    config.owners.includes(number) ||
    db.get('sudo', []).includes(number)

  if (!isOwner && db.get('banned', []).includes(number)) return

  // Sécurité de groupe (antilink, antispam, antidelete...)
  if (await inspect(sock, msg, { from, sender, number, isOwner, text })) return

  const settings = db.get('settings', {})
  if (settings.mode === 'private' && !isOwner) return

  if (settings.autoreact && !msg.key.fromMe && !msg.message.protocolMessage) {
    const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)]
    sock.sendMessage(from, { react: { text: emoji, key: msg.key } }).catch(() => {})
  }

  if (!text) return

  const cfg = { ...config, botName: settings.botName || config.botName }
  const reply = (t) => sock.sendMessage(from, { text: t }, { quoted: msg })

  if (process.env.DEBUG && text) console.log("🔎 préfixe attendu :", JSON.stringify(config.prefix))
  // Réponses automatiques
  if (!text.startsWith(config.prefix)) {
    if (msg.key.fromMe || settings.autoreply === false) return
    const hit = db.get('replies', {})[text.trim().toLowerCase()]
    if (hit) await reply(hit)
    return
  }

  const [name, ...args] = text.slice(config.prefix.length).trim().split(/\s+/)
  const q = text.slice(config.prefix.length + name.length).trim()
  const key = name.toLowerCase()
  const cmd = commands.get(key)

  if (cmd) {
    if (cmd.owner && !isOwner) return reply('⛔ Commande réservée au propriétaire.')
    console.log(`▶️ .${key} par +${number}`)
    try {
      return await cmd.run({ sock, msg, from, args, q, text, sender, isOwner, reply, config: cfg })
    } catch (e) {
      console.log(`❌ Erreur .${key} :`, e)
      reportError(sock, key, e, number)
      return reply('❌ Erreur : ' + e.message)
    }
  }

  const custom = db.get('cases', {})[key]
  if (custom) await reply(custom)
}
