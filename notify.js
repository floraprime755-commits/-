import { jidNormalizedUser } from '@whiskeysockets/baileys'
import config from './config.js'
import * as db from './db.js'

export async function notifyOwner(sock, text) {
  if (!sock?.user) return
  const targets = new Set([jidNormalizedUser(sock.user.id)])
  for (const n of config.owners) {
    if (/^\d{7,}$/.test(n)) targets.add(n + '@s.whatsapp.net')
  }
  for (const jid of targets) await sock.sendMessage(jid, { text }).catch(() => {})
}

export function logError(source, err) {
  const list = db.get('errors', [])
  list.push({ t: Date.now(), source, msg: String(err?.message || err).slice(0, 300) })
  while (list.length > 20) list.shift()
  db.save('errors')
}

let lastAlert = 0
export function reportError(sock, cmd, err, number) {
  logError('.' + cmd, err)
  if (db.get('settings', {}).alerts === false) return
  if (Date.now() - lastAlert < 30000) return
  lastAlert = Date.now()
  notifyOwner(
    sock,
    `🚨 *Erreur du bot*\nCommande : .${cmd}\nPar : +${number}\nErreur : ${String(err?.message || err).slice(0, 200)}\n\nDétails : .errors`
  )
}
