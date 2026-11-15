import * as db from '../db.js'
import config from '../config.js'
import { getTarget } from '../utils.js'

export default [
  {
    name: 'sudoadd',
    owner: true,
    async run({ msg, args, from, reply }) {
      const t = getTarget({ msg, args, from })
      if (!t) return reply('Usage : .sudoadd (réponds, mentionne ou tape un numéro)')
      const list = db.get('sudo', [])
      if (list.includes(t)) return reply('ℹ️ Déjà sudo.')
      list.push(t)
      db.save('sudo')
      return reply(`✅ +${t} ajouté aux sudo.`)
    }
  },
  {
    name: 'delsudo',
    owner: true,
    async run({ msg, args, from, reply }) {
      const t = getTarget({ msg, args, from })
      if (!t) return reply('Usage : .delsudo (réponds, mentionne ou tape un numéro)')
      const list = db.get('sudo', [])
      if (!list.includes(t)) return reply("ℹ️ Ce numéro n'est pas sudo.")
      list.splice(list.indexOf(t), 1)
      db.save('sudo')
      return reply(`✅ +${t} retiré des sudo.`)
    }
  },
  {
    name: 'listsudo',
    owner: true,
    async run({ reply }) {
      const list = db.get('sudo', [])
      return reply(
        `👑 *Owners* : ${config.owners.map((n) => '+' + n).join(', ') || '—'}\n\n` +
        `🛡️ *Sudo* :\n` +
        (list.length ? list.map((n, i) => `${i + 1}. +${n}`).join('\n') : 'Aucun')
      )
    }
  }
]
