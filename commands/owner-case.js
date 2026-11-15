import * as db from '../db.js'

const parse = (q) => {
  const i = q.indexOf('|')
  if (i === -1) return [q.trim().toLowerCase(), '']
  return [q.slice(0, i).trim().toLowerCase(), q.slice(i + 1).trim()]
}

export default [
  {
    name: 'addcase',
    owner: true,
    async run({ q, reply }) {
      const [name, answer] = parse(q)
      if (!/^[a-z0-9_]+$/.test(name) || !answer)
        return reply('Usage : .addcase nom | réponse\nEx : .addcase regles | Pas de spam !')
      const cases = db.get('cases', {})
      cases[name] = answer
      db.save('cases')
      return reply(`✅ Commande *.${name}* créée.`)
    }
  },
  {
    name: 'delcase',
    owner: true,
    async run({ args, reply }) {
      const name = (args[0] || '').toLowerCase()
      const cases = db.get('cases', {})
      if (!cases[name]) return reply('❌ Commande introuvable. Usage : .delcase nom')
      delete cases[name]
      db.save('cases')
      return reply(`🗑️ Commande *.${name}* supprimée.`)
    }
  },
  {
    name: 'listcase',
    owner: true,
    async run({ reply, config }) {
      const names = Object.keys(db.get('cases', {}))
      return reply(
        `📜 *Commandes perso* (${names.length})\n` +
        (names.length ? names.map((n) => `• ${config.prefix}${n}`).join('\n') : 'Aucune')
      )
    }
  }
]
