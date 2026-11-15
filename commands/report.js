import * as db from '../db.js'
import { num } from '../utils.js'
import { notifyOwner } from '../notify.js'

const last = new Map()

export default [
  {
    name: 'report',
    async run({ sock, msg, from, q, sender, reply }) {
      if (!q)
        return reply('Usage : .report décris le problème\nEx : .report la commande .menu ne répond pas')
      const n = num(sender)
      if (Date.now() - (last.get(n) || 0) < 60000)
        return reply('⏳ Attends une minute avant un nouveau signalement.')
      last.set(n, Date.now())

      let where = 'discussion privée'
      if (from.endsWith('@g.us')) {
        try { where = `groupe « ${(await sock.groupMetadata(from)).subject} »` }
        catch { where = 'un groupe' }
      }
      const who = msg.key.fromMe ? 'toi-même' : '+' + n
      await notifyOwner(sock, `🐞 *Signalement*\nDe : ${who}\nDepuis : ${where}\n\n${q}`)
      return reply('✅ Merci ! Ton signalement a été envoyé au propriétaire.')
    }
  },

  {
    name: 'errors',
    owner: true,
    async run({ args, reply, config }) {
      const list = db.get('errors', [])
      if (args[0]?.toLowerCase() === 'clear') {
        list.length = 0
        db.save('errors')
        return reply('🧹 Journal des erreurs vidé.')
      }
      if (!list.length) return reply('✅ Aucune erreur enregistrée.')
      const fmt = (t) =>
        new Date(t).toLocaleString('fr-FR', {
          timeZone: config.timezone,
          dateStyle: 'short',
          timeStyle: 'short'
        })
      return reply(
        `🚨 *Dernières erreurs* (${list.length})\n\n` +
        list.slice(-10).reverse().map((e) => `• ${fmt(e.t)} — ${e.source}\n  ${e.msg}`).join('\n') +
        '\n\nVider : .errors clear'
      )
    }
  },

  {
    name: 'alerts',
    owner: true,
    async run({ args, reply }) {
      const s = db.get('settings', {})
      const opt = (args[0] || '').toLowerCase()
      if (!['on', 'off'].includes(opt))
        return reply(`Alertes d'erreur : *${s.alerts === false ? 'off' : 'on'}*\nUsage : .alerts on / off`)
      s.alerts = opt === 'on'
      db.save('settings')
      return reply(`✅ Alertes d'erreur : *${opt}*`)
    }
  }
]
