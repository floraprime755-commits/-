import * as db from '../db.js'
import config from '../config.js'
import { getTarget } from '../utils.js'

export default [
  {
    name: 'ban',
    owner: true,
    async run({ msg, args, from, reply }) {
      const t = getTarget({ msg, args, from })
      if (!t) return reply('Usage : .ban (réponds, mentionne ou tape un numéro)')
      if (config.owners.includes(t) || db.get('sudo', []).includes(t))
        return reply('⛔ Impossible de bannir un owner ou un sudo.')
      const list = db.get('banned', [])
      if (list.includes(t)) return reply('ℹ️ Déjà banni.')
      list.push(t)
      db.save('banned')
      return reply(`🚫 +${t} est banni : le bot l'ignore.`)
    }
  },
  {
    name: 'unban',
    owner: true,
    async run({ msg, args, from, reply }) {
      const t = getTarget({ msg, args, from })
      if (!t) return reply('Usage : .unban (réponds, mentionne ou tape un numéro)')
      const list = db.get('banned', [])
      if (!list.includes(t)) return reply("ℹ️ Ce numéro n'est pas banni.")
      list.splice(list.indexOf(t), 1)
      db.save('banned')
      return reply(`✅ +${t} débanni.`)
    }
  },
  {
    name: 'banlist',
    owner: true,
    async run({ reply }) {
      const list = db.get('banned', [])
      return reply(
        `🚫 *Bannis* (${list.length})\n` +
        (list.length ? list.map((n, i) => `${i + 1}. +${n}`).join('\n') : 'Aucun')
      )
    }
  }
]
