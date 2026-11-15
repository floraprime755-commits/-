import * as db from '../db.js'

export default [
  {
    name: 'autoleave',
    owner: true,
    async run({ args, reply }) {
      const s = db.get('settings', {})
      const opt = (args[0] || '').toLowerCase()
      if (!['on', 'off'].includes(opt))
        return reply(`Départ auto des groupes : *${s.autoleave ? 'on' : 'off'}*\nUsage : .autoleave on / off`)
      s.autoleave = opt === 'on'
      db.save('settings')
      return reply(`✅ Départ auto des nouveaux groupes : *${opt}*`)
    }
  },
  {
    name: 'allowgroup',
    owner: true,
    async run({ from, reply }) {
      if (!from.endsWith('@g.us')) return reply('❌ À utiliser dans un groupe.')
      const list = db.get('allowedGroups', [])
      if (!list.includes(from)) {
        list.push(from)
        db.save('allowedGroups')
      }
      return reply('✅ Groupe autorisé : je ne le quitterai pas automatiquement.')
    }
  },
  {
    name: 'denygroup',
    owner: true,
    async run({ from, reply }) {
      const list = db.get('allowedGroups', [])
      const i = list.indexOf(from)
      if (i === -1) return reply("ℹ️ Ce groupe n'était pas dans la liste.")
      list.splice(i, 1)
      db.save('allowedGroups')
      return reply('✅ Groupe retiré de la liste des autorisés.')
    }
  }
]
