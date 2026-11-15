import * as db from '../db.js'

const parse = (q) => {
  const i = q.indexOf('|')
  if (i === -1) return [q.trim().toLowerCase(), '']
  return [q.slice(0, i).trim().toLowerCase(), q.slice(i + 1).trim()]
}

export default [
  {
    name: 'addreply',
    owner: true,
    async run({ q, reply }) {
      const [word, answer] = parse(q)
      if (!word || !answer)
        return reply('Usage : .addreply mot | réponse\nEx : .addreply salut | Bonjour 👋')
      db.get('replies', {})[word] = answer
      db.save('replies')
      return reply(`✅ Réponse auto ajoutée pour « ${word} ».`)
    }
  },
  {
    name: 'delreply',
    owner: true,
    async run({ q, reply }) {
      const word = q.trim().toLowerCase()
      const replies = db.get('replies', {})
      if (!replies[word]) return reply('❌ Introuvable. Usage : .delreply mot')
      delete replies[word]
      db.save('replies')
      return reply(`🗑️ Réponse auto « ${word} » supprimée.`)
    }
  },
  {
    name: 'listreply',
    owner: true,
    async run({ reply }) {
      const words = Object.keys(db.get('replies', {}))
      return reply(
        `💬 *Réponses auto* (${words.length})\n` +
        (words.length ? words.map((w) => `• ${w}`).join('\n') : 'Aucune')
      )
    }
  },
  {
    name: 'reply',
    owner: true,
    async run({ args, reply }) {
      const s = db.get('settings', {})
      const opt = (args[0] || '').toLowerCase()
      if (opt !== 'on' && opt !== 'off')
        return reply(`Réponses auto : *${s.autoreply === false ? 'OFF' : 'ON'}*\nUsage : .reply on / off`)
      s.autoreply = opt === 'on'
      db.save('settings')
      return reply(`✅ Réponses auto : *${opt.toUpperCase()}*`)
    }
  }
]
