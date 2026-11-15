import { registerAutoLeave } from './autoleave.js'
import { startBio } from './autobio.js'
import * as db from './db.js'
import { num } from './utils.js'

const DEF_WELCOME = '👋 Bienvenue @user dans *@group* !\nNous sommes maintenant @count membres.'
const DEF_GOODBYE = '👋 @user a quitté *@group*. À bientôt !'

const fill = (t, jid, meta) =>
  t
    .replaceAll('@user', '@' + num(jid))
    .replaceAll('@group', meta.subject)
    .replaceAll('@count', String(meta.participants.length))

async function announce(sock, id, jid, text) {
  let pic
  try { pic = await sock.profilePictureUrl(jid, 'image') } catch {}
  await sock.sendMessage(
    id,
    pic ? { image: { url: pic }, caption: text, mentions: [jid] } : { text, mentions: [jid] }
  )
}

export function registerEvents(sock) {
  registerAutoLeave(sock)
  startBio(sock)
  sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
    try {
      const g = db.get('groups', {})[id]
      if (!g) return
      const meta = await sock.groupMetadata(id)
      const me = num(sock.user.id)

      for (const p of participants) {
        const jid = typeof p === 'string' ? p : p.id
        if (num(jid) === me) continue
        const phone = (typeof p === 'string' ? p : p.phoneNumber) || jid

        if (
          action === 'add' && g.antinum && phone.endsWith('@s.whatsapp.net') &&
          g.prefixes?.some((x) => num(phone).startsWith(x))
        ) {
          await sock.groupParticipantsUpdate(id, [jid], 'remove').catch(() => {})
          continue
        }
        if (action === 'add' && g.welcome)
          await announce(sock, id, jid, fill(g.welcomeMsg || DEF_WELCOME, jid, meta))
        if (action === 'remove' && g.goodbye)
          await announce(sock, id, jid, fill(g.goodbyeMsg || DEF_GOODBYE, jid, meta))
      }
    } catch (e) {
      console.log('❌ group-participants :', e.message)
    }
  })

  sock.ev.on('call', async (calls) => {
    if (!db.get('settings', {}).anticall) return
    for (const c of calls) {
      if (c.status !== 'offer') continue
      await sock.rejectCall(c.id, c.from).catch(() => {})
      await sock.sendMessage(c.from, { text: '📵 Les appels ne sont pas acceptés. Écris un message.' }).catch(() => {})
    }
  })
}
