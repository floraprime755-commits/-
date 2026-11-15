import * as db from './db.js'
import { num, ids } from './utils.js'

const LINK = /(https?:\/\/|www\.)\S+|chat\.whatsapp\.com\/\S+/i
const FEATURES = ['antilink', 'antisticker', 'antigif', 'antinum', 'antispam', 'antibot', 'antigroupmention']

// Cache des infos de groupe (60 s)
const metaCache = new Map()
async function getMeta(sock, jid) {
  const c = metaCache.get(jid)
  if (c && Date.now() - c.t < 60000) return c.meta
  const meta = await sock.groupMetadata(jid)
  metaCache.set(jid, { t: Date.now(), meta })
  return meta
}

// Mémoire des derniers messages (antidelete / antiedit)
const store = new Map()
function remember(msg, text) {
  store.set(msg.key.id, { msg, text })
  if (store.size > 800) store.delete(store.keys().next().value)
}

const spam = new Map()

// Retourne true si le message doit être ignoré par le reste du bot
export async function inspect(sock, msg, { from, sender, number, isOwner, text }) {
  if (!from.endsWith('@g.us')) return false
  const g = db.get('groups', {})[from]
  if (!g) return false
  const m = msg.message
  const proto = m.protocolMessage

  // Suppression / modification d'un message
  if (proto) {
    const old = store.get(proto.key?.id)
    const jid = old?.msg.key.participant
    if (!old || !jid) return false
    const who = num(jid)
    if (proto.type === 0 && g.antidelete === 'on') {
      await sock.sendMessage(from, {
        text: `🗑️ Message de @${who} supprimé :${old.text ? '\n\n' + old.text : ''}`,
        mentions: [jid]
      })
      if (!old.text) await sock.sendMessage(from, { forward: old.msg }).catch(() => {})
    }
    if (proto.type === 14 && g.antiedit === 'on') {
      const em = proto.editedMessage
      const now = em?.conversation || em?.extendedTextMessage?.text || ''
      await sock.sendMessage(from, {
        text: `✏️ Message de @${who} modifié\n\n*Avant :* ${old.text || '—'}\n*Après :* ${now || '—'}`,
        mentions: [jid]
      })
      old.text = now
    }
    return false
  }

  if (g.antidelete === 'on' || g.antiedit === 'on') remember(msg, text)

  // Owner, sudo et bot ne sont jamais sanctionnés
  if (msg.key.fromMe || isOwner) return false

  const active = FEATURES.some((f) => g[f]) || g.muted?.length
  if (!active) return false
  const meta = await getMeta(sock, from).catch(() => null)
  if (!meta) return false
  if (meta.participants.some((p) => p.admin && ids(p).includes(number))) return false

  const del = () => sock.sendMessage(from, { delete: msg.key }).catch(() => {})
  const punish = async (feature, reason) => {
    await del()
    if (g[feature] === 'kick') {
      await sock.sendMessage(from, { text: `🚫 @${number} a été exclu : ${reason}`, mentions: [sender] })
      await sock.groupParticipantsUpdate(from, [sender], 'remove').catch(() => {})
    } else {
      await sock.sendMessage(from, { text: `⚠️ @${number}, ${reason}`, mentions: [sender] })
    }
    return true
  }

  if (g.muted?.includes(number)) { await del(); return true }
  if (g.antilink && LINK.test(text)) return punish('antilink', 'les liens sont interdits ici.')
  if (g.antisticker && m.stickerMessage) return punish('antisticker', 'les stickers sont interdits ici.')
  if (g.antigif && m.videoMessage?.gifPlayback) return punish('antigif', 'les GIFs sont interdits ici.')
  if (g.antigroupmention && (m.groupStatusMentionMessage || m.groupMentionedMessage))
    return punish('antigroupmention', 'les mentions de groupe sont interdites.')
  if (g.antibot && msg.key.id?.startsWith('BAE5') && msg.key.id.length === 16)
    return punish('antibot', 'les bots sont interdits ici.')
  if (g.antinum && sender.endsWith('@s.whatsapp.net') && g.prefixes?.some((p) => number.startsWith(p)))
    return punish('antinum', 'ce préfixe de numéro est interdit ici.')

  if (g.antispam) {
    const k = from + number
    const now = Date.now()
    const list = (spam.get(k) || []).filter((t) => now - t < 6000)
    list.push(now)
    spam.set(k, list)
    if (list.length > 5) {
      spam.delete(k)
      return punish('antispam', 'stop le spam.')
    }
  }
  return false
}
