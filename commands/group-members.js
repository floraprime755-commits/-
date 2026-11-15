import { groupCmd, getTarget, batch, phones, num } from '../utils.js'

// Action sur une personne
const one = (name, action, done) =>
  groupCmd(name, { botAdmin: true }, async ({ sock, msg, args, from, find, isMe, reply }) => {
    const t = getTarget({ msg, args, from })
    const p = t && find(t)
    if (!p) return reply(`Usage : .${name} (réponds, mentionne ou tape un numéro du groupe)`)
    if (isMe(p)) return reply('❌ Pas sur moi-même.')
    await sock.groupParticipantsUpdate(from, [p.id], action)
    return reply(done)
  })

// Action de masse (demande confirmation)
const mass = (name, label, pick, action) =>
  groupCmd(name, { botAdmin: true }, async ({ sock, from, args, sender, meta, isMe, ids, reply }) => {
    const a = args.filter((x) => x.toLowerCase() !== 'confirm')
    const confirmed = a.length !== args.length
    const list = pick(meta.participants, a)
      .filter((p) => !isMe(p) && !ids(p).includes(num(sender)))
      .map((p) => p.id)
    if (!list.length) return reply('ℹ️ Personne à traiter.')
    if (!confirmed)
      return reply(`⚠️ ${label} : *${list.length}* membre(s).\nPour valider, ajoute *confirm* à la commande.`)
    await reply(`⏳ Traitement de ${list.length} membre(s)...`)
    await batch(sock, from, list, action)
    return reply('✅ Terminé.')
  })

// Demandes d'adhésion
const requests = (name, action, label) =>
  groupCmd(name, { botAdmin: true }, async ({ sock, from, reply }) => {
    const list = await sock.groupRequestParticipantsList(from)
    if (!list.length) return reply('ℹ️ Aucune demande en attente.')
    await sock.groupRequestParticipantsUpdate(
      from,
      list.map((r) => r.jid || r.phone_number),
      action
    )
    return reply(`✅ ${list.length} demande(s) ${label}.`)
  })

export default [
  one('promote', 'promote', '✅ Promu admin.'),
  one('demote', 'demote', '✅ Rétrogradé.'),
  one('kick', 'remove', '✅ Membre exclu.'),
  mass('kickall', 'Exclure tous les membres non-admins', (ps) => ps.filter((p) => !p.admin), 'remove'),
  mass('kickadmin', 'Exclure tous les admins', (ps) => ps.filter((p) => p.admin === 'admin'), 'remove'),
  mass('promoteall', 'Promouvoir tous les membres', (ps) => ps.filter((p) => !p.admin), 'promote'),
  mass('demoteall', 'Rétrograder tous les admins', (ps) => ps.filter((p) => p.admin === 'admin'), 'demote'),
  mass(
    'kicknum',
    'Exclure les numéros commençant par le préfixe donné (ex: .kicknum 212)',
    (ps, a) => {
      const pre = (a[0] || '').replace(/\D/g, '')
      return pre ? ps.filter((p) => !p.admin && phones(p).some((n) => n.startsWith(pre))) : []
    },
    'remove'
  ),
  requests('acceptall', 'approve', 'acceptée(s)'),
  requests('rejectall', 'reject', 'rejetée(s)')
]
