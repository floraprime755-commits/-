import { getTarget } from '../utils.js'

const blockCmd = (name, action, done) => ({
  name,
  owner: true,
  async run({ sock, msg, args, from, reply }) {
    const t = getTarget({ msg, args, from })
    if (!t) return reply(`Usage : .${name} (réponds, mentionne ou tape un numéro)`)
    await sock.updateBlockStatus(t + '@s.whatsapp.net', action)
    return reply(done)
  }
})

export default [
  blockCmd('block', 'block', '🚫 Contact bloqué.'),
  blockCmd('unblock', 'unblock', '✅ Contact débloqué.'),
  {
    name: 'left',
    owner: true,
    async run({ sock, from, reply }) {
      if (!from.endsWith('@g.us')) return reply('❌ Commande réservée aux groupes.')
      await reply('👋 Je quitte le groupe.')
      await sock.groupLeave(from)
    }
  }
]
