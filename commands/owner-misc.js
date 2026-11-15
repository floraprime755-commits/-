import fs from 'fs'
import pino from 'pino'
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import * as db from '../db.js'
import { num } from '../utils.js'

export default [
  {
    name: 'newgroup',
    owner: true,
    async run({ sock, msg, args, reply }) {
      const ctx = msg.message?.extendedTextMessage?.contextInfo
      const members = new Set()
      ;(ctx?.mentionedJid || []).forEach((j) => members.add(num(j)))
      if (ctx?.participant) members.add(num(ctx.participant))
      args.filter((a) => /^\d{7,}$/.test(a)).forEach((n) => members.add(n))
      members.delete(num(sock.user.id))

      const name = args.filter((a) => !/^\d{7,}$/.test(a) && !a.startsWith('@')).join(' ')
      if (!name)
        return reply('Usage : .newgroup NomDuGroupe 22507XXXXXXXX (ou mentionne / réponds)')
      if (!members.size) return reply('❌ Ajoute au moins un membre (numéro, mention ou réponse).')

      await sock.groupCreate(name, [...members].map((n) => n + '@s.whatsapp.net'))
      return reply(`✅ Groupe *${name}* créé.`)
    }
  },
  {
    name: 'setbotname',
    owner: true,
    async run({ q, reply }) {
      if (!q) return reply('Usage : .setbotname NouveauNom')
      const s = db.get('settings', {})
      s.botName = q
      db.save('settings')
      return reply(`✅ Nom du bot : *${q}*`)
    }
  },
  {
    name: 'setbotimg',
    owner: true,
    async run({ sock, msg, from, reply }) {
      const ctx = msg.message?.extendedTextMessage?.contextInfo
      let target = null
      if (msg.message?.imageMessage) target = msg
      else if (ctx?.quotedMessage?.imageMessage) {
        target = {
          key: { remoteJid: from, id: ctx.stanzaId, participant: ctx.participant },
          message: ctx.quotedMessage
        }
      }
      if (!target) return reply('📸 Réponds à une image avec *.setbotimg*')
      const buffer = await downloadMediaMessage(
        target,
        'buffer',
        {},
        { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage }
      )
      fs.mkdirSync('data', { recursive: true })
      fs.writeFileSync('data/botimg.jpg', buffer)
      return reply('✅ Image du bot enregistrée (elle servira pour le menu).')
    }
  },
  {
    name: 'broadcaster',
    owner: true,
    async run({ sock, q, reply, config }) {
      if (!q) return reply('Usage : .broadcaster ton message')
      const groups = Object.keys(await sock.groupFetchAllParticipating())
      await reply(`📢 Envoi vers ${groups.length} groupes...`)
      let ok = 0
      for (const jid of groups) {
        try {
          await sock.sendMessage(jid, { text: `📢 *${config.botName}*\n\n${q}` })
          ok++
        } catch {}
        await new Promise((r) => setTimeout(r, 2000))
      }
      return reply(`✅ Envoyé dans ${ok}/${groups.length} groupes.`)
    }
  }
]
