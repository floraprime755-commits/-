import * as db from '../db.js'
import base from '../config.js'
import { updateBio } from '../autobio.js'

// Applique le préfixe sauvegardé au démarrage
base.prefix = db.get('settings', {}).prefix || base.prefix

export default [
  {
    name: 'runtime',
    async run({ reply, config }) {
      const up = Date.now() - config.deployedAt.getTime()
      const d = Math.floor(up / 86400000)
      const h = Math.floor((up % 86400000) / 3600000)
      const m = Math.floor((up % 3600000) / 60000)
      const s = Math.floor((up % 60000) / 1000)
      return reply(`⏱️ *Runtime* : ${d}j ${h}h ${m}min ${s}s`)
    }
  },

  {
    name: 'repo',
    async run({ args, isOwner, reply, config }) {
      const s = db.get('settings', {})
      if (args[0]?.toLowerCase() === 'set') {
        if (!isOwner) return reply('⛔ Réservé au propriétaire.')
        if (!/^https?:\/\//.test(args[1] || ''))
          return reply('Usage : .repo set https://github.com/...')
        s.repo = args[1]
        db.save('settings')
        return reply('✅ Lien du dépôt enregistré.')
      }
      if (!s.repo)
        return reply('📦 Aucun dépôt configuré.' + (isOwner ? '\nUtilise : .repo set https://...' : ''))
      return reply(`📦 *${config.botName}*\n🔗 ${s.repo}`)
    }
  },

  {
    name: 'setprefix',
    owner: true,
    async run({ args, reply }) {
      const p = args[0]
      if (!p || !/^[^\sa-zA-Z0-9]{1,3}$/.test(p))
        return reply(`Préfixe actuel : *${base.prefix}*\nUsage : .setprefix ! (1 à 3 symboles, sans lettres ni chiffres)`)
      const s = db.get('settings', {})
      s.prefix = p
      db.save('settings')
      base.prefix = p
      return reply(`✅ Nouveau préfixe : *${p}*\nExemple : ${p}menu`)
    }
  },

  {
    name: 'setmenustyle',
    owner: true,
    async run({ args, reply }) {
      const s = db.get('settings', {})
      const n = Number(args[0])
      if (![1, 2, 3].includes(n))
        return reply(`🎨 Style actuel : *${s.menuStyle || 1}*\n1 → boîtes\n2 → liste\n3 → compact\nUsage : .setmenustyle 2`)
      s.menuStyle = n
      db.save('settings')
      return reply(`✅ Style du menu : *${n}*\nTape ${base.prefix}menu pour voir.`)
    }
  },

  {
    name: 'autobio',
    owner: true,
    async run({ sock, args, reply }) {
      const s = db.get('settings', {})
      const opt = (args[0] || '').toLowerCase()
      if (!['on', 'off'].includes(opt))
        return reply(`Auto-bio : *${s.autobio ? 'on' : 'off'}*\nUsage : .autobio on / off`)
      s.autobio = opt === 'on'
      db.save('settings')
      if (s.autobio) await updateBio(sock)
      return reply(`✅ Auto-bio : *${opt}*`)
    }
  }
]
