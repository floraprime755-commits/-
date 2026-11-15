import * as db from '../db.js'
import { groupCmd, getTarget } from '../utils.js'

const gset = (jid) => {
  const all = db.get('groups', {})
  return (all[jid] ||= {})
}

// off / on (supprime) / kick
const toggle = (name, label, modes = ['off', 'delete', 'kick']) =>
  groupCmd(name, {}, async ({ args, from, admins, isMe, reply }) => {
    const g = gset(from)
    const raw = (args[0] || '').toLowerCase()
    const opt = raw === 'on' && modes.includes('delete') ? 'delete' : raw
    if (!modes.includes(opt)) {
      const usage = modes.map((m) => (m === 'delete' ? 'on' : m)).join(' / ')
      return reply(`${label} : *${g[name] || 'off'}*\nUsage : .${name} ${usage}`)
    }
    if (opt === 'off') delete g[name]
    else g[name] = opt
    db.save('groups')
    const warn =
      opt !== 'off' && modes.includes('delete') && !admins.some(isMe)
        ? '\n⚠️ Je ne suis pas admin : je ne pourrai ni supprimer ni exclure.'
        : ''
    return reply(`✅ ${label} : *${opt === 'delete' ? 'on (supprime)' : opt}*${warn}`)
  })

const flag = (name) =>
  groupCmd(name, {}, async ({ args, from, reply }) => {
    const g = gset(from)
    const opt = (args[0] || '').toLowerCase()
    if (!['on', 'off'].includes(opt))
      return reply(`${name} : *${g[name] ? 'on' : 'off'}*\nUsage : .${name} on / off`)
    if (opt === 'on') g[name] = true
    else delete g[name]
    db.save('groups')
    return reply(`✅ ${name} : *${opt}*`)
  })

const setMsg = (name, key) =>
  groupCmd(name, {}, async ({ q, from, reply }) => {
    if (!q) return reply(`Usage : .${name} ton texte\nVariables : @user @group @count`)
    gset(from)[key] = q
    db.save('groups')
    return reply('✅ Message enregistré.')
  })

const globalFlag = (name, label) => ({
  name,
  owner: true,
  async run({ args, reply }) {
    const s = db.get('settings', {})
    const opt = (args[0] || '').toLowerCase()
    if (!['on', 'off'].includes(opt))
      return reply(`${label} : *${s[name] ? 'on' : 'off'}*\nUsage : .${name} on / off`)
    s[name] = opt === 'on'
    db.save('settings')
    return reply(`✅ ${label} : *${opt}*`)
  }
})

export default [
  toggle('antilink', 'Anti-liens'),
  toggle('antisticker', 'Anti-stickers'),
  toggle('antigif', 'Anti-GIF'),
  toggle('antispam', 'Anti-spam'),
  toggle('antibot', 'Anti-bots'),
  toggle('antigroupmention', 'Anti-mention de groupe'),
  toggle('antidelete', 'Anti-suppression', ['off', 'on']),
  toggle('antiedit', 'Anti-modification', ['off', 'on']),

  groupCmd('antinum', {}, async ({ args, from, reply }) => {
    const g = gset(from)
    const raw = (args[0] || '').toLowerCase()
    const opt = raw === 'on' ? 'delete' : raw
    if (opt === 'off') {
      delete g.antinum
      delete g.prefixes
      db.save('groups')
      return reply('✅ Anti-numéros : *off*')
    }
    const prefixes = args.slice(1).join(' ').split(/[ ,]+/).map((x) => x.replace(/\D/g, '')).filter(Boolean)
    if (!['delete', 'kick'].includes(opt) || !prefixes.length)
      return reply(
        `Anti-numéros : *${g.antinum || 'off'}*${g.prefixes?.length ? ' (+' + g.prefixes.join(', +') + ')' : ''}\n` +
        'Usage : .antinum on 212,92 / .antinum kick 212 / .antinum off'
      )
    g.antinum = opt
    g.prefixes = prefixes
    db.save('groups')
    return reply(`✅ Anti-numéros : *${opt}* pour +${prefixes.join(', +')}`)
  }),

  flag('welcome'),
  flag('goodbye'),
  setMsg('setwelcome', 'welcomeMsg'),
  setMsg('setgoodbye', 'goodbyeMsg'),

  groupCmd('muteuser', { botAdmin: true }, async ({ msg, args, from, find, isMe, ids, reply }) => {
    const t = getTarget({ msg, args, from })
    const p = t && find(t)
    if (!p) return reply('Usage : .muteuser (réponds, mentionne ou tape un numéro)')
    if (isMe(p)) return reply('❌ Pas sur moi-même.')
    if (p.admin) return reply('❌ Impossible de réduire un admin au silence.')
    const g = gset(from)
    g.muted = [...new Set([...(g.muted || []), ...ids(p)])]
    db.save('groups')
    return reply('🔇 Utilisateur muet : ses messages seront supprimés.')
  }),

  groupCmd('unmuteuser', {}, async ({ msg, args, from, find, ids, reply }) => {
    const t = getTarget({ msg, args, from })
    const p = t && find(t)
    if (!p) return reply('Usage : .unmuteuser (réponds, mentionne ou tape un numéro)')
    const g = gset(from)
    const rm = ids(p)
    g.muted = (g.muted || []).filter((x) => !rm.includes(x))
    db.save('groups')
    return reply('🔊 Utilisateur autorisé à reparler.')
  }),

  groupCmd('unmuteall', {}, async ({ from, reply }) => {
    gset(from).muted = []
    db.save('groups')
    return reply('🔊 Tous les utilisateurs muets sont libérés.')
  }),

  groupCmd('security', {}, async ({ from, meta, reply }) => {
    const g = db.get('groups', {})[from] || {}
    const st = (k) => (g[k] ? '✅ ' + (g[k] === true ? 'on' : g[k]) : '❌ off')
    const keys = [
      'antilink', 'antisticker', 'antigif', 'antinum', 'antispam', 'antibot',
      'antigroupmention', 'antidelete', 'antiedit', 'welcome', 'goodbye'
    ]
    return reply(
      `🛡️ *Sécurité : ${meta.subject}*\n\n` +
      keys.map((k) => `• ${k} : ${st(k)}`).join('\n') +
      `\n• utilisateurs muets : ${g.muted?.length ? 'oui' : 'aucun'}`
    )
  }),

  groupCmd('resetsettings', {}, async ({ from, reply }) => {
    delete db.get('groups', {})[from]
    db.save('groups')
    return reply('♻️ Réglages du groupe réinitialisés.')
  }),

  globalFlag('autoreact', 'Auto-réaction'),
  globalFlag('anticall', 'Anti-appel'),

  {
    name: 'mode',
    owner: true,
    async run({ args, reply }) {
      const s = db.get('settings', {})
      const opt = (args[0] || '').toLowerCase()
      if (!['public', 'private'].includes(opt))
        return reply(`Mode : *${s.mode || 'public'}*\nUsage : .mode public / private`)
      s.mode = opt
      db.save('settings')
      return reply(`✅ Mode : *${opt}*`)
    }
  }
]
