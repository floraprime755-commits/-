import pino from 'pino'
import { downloadMediaMessage } from '@whiskeysockets/baileys'

export const num = (jid = '') => jid.split('@')[0].split(':')[0]
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Cible : mention > réponse > numéro > discussion privée
export function getTarget({ msg, args, from }) {
  const ctx = msg.message?.extendedTextMessage?.contextInfo
  if (ctx?.mentionedJid?.length) return num(ctx.mentionedJid[0])
  if (ctx?.participant) return num(ctx.participant)
  const n = args.map((a) => a.replace(/\D/g, '')).find((a) => a.length >= 7)
  if (n) return n
  if (!from.endsWith('@g.us')) return num(from)
  return null
}

// Toutes les identités d'un participant (compatible LID)
export const ids = (p) =>
  [p.id, p.jid, p.phoneNumber, p.lid].filter(Boolean).map(num)

// Vrais numéros de téléphone uniquement
export const phones = (p) =>
  [p.id, p.jid, p.phoneNumber]
    .filter((x) => x?.endsWith('@s.whatsapp.net'))
    .map(num)

// Télécharge l'image du message ou du message cité
export async function getImage(sock, msg, from) {
  const ctx = msg.message?.extendedTextMessage?.contextInfo
  let target = null
  if (msg.message?.imageMessage) target = msg
  else if (ctx?.quotedMessage?.imageMessage) {
    target = {
      key: { remoteJid: from, id: ctx.stanzaId, participant: ctx.participant },
      message: ctx.quotedMessage
    }
  }
  if (!target) return null
  return downloadMediaMessage(target, 'buffer', {}, {
    logger: pino({ level: 'silent' }),
    reuploadRequest: sock.updateMediaMessage
  })
}

// Actions par lots (évite les blocages)
export async function batch(sock, from, jids, action) {
  for (let i = 0; i < jids.length; i += 5) {
    await sock.groupParticipantsUpdate(from, jids.slice(i, i + 5), action)
    await sleep(1500)
  }
}

// Fabrique une commande de groupe avec contrôle des droits
export function groupCmd(name, opts, fn) {
  const { admin = true, botAdmin = false } = opts
  return {
    name,
    async run(ctx) {
      const { sock, from, sender, isOwner, reply } = ctx
      if (!from.endsWith('@g.us')) return reply('❌ Commande réservée aux groupes.')
      const meta = await sock.groupMetadata(from)
      const me = [num(sock.user.id), num(sock.user.lid || '')].filter(Boolean)
      const admins = meta.participants.filter((p) => p.admin)
      const senderAdmin = admins.some((p) => ids(p).includes(num(sender)))
      const botIsAdmin = admins.some((p) => ids(p).some((i) => me.includes(i)))
      if (admin && !isOwner && !senderAdmin) return reply('⛔ Réservé aux admins du groupe.')
      if (botAdmin && !botIsAdmin) return reply('❌ Je dois être admin du groupe pour faire ça.')
      const find = (n) => meta.participants.find((p) => ids(p).includes(n))
      const isMe = (p) => ids(p).some((i) => me.includes(i))
      return fn({ ...ctx, meta, admins, find, isMe, ids })
    }
  }
}
