import { groupCmd, getImage } from '../utils.js'

const setting = (name, value, done) =>
  groupCmd(name, { botAdmin: true }, async ({ sock, from, reply }) => {
    await sock.groupSettingUpdate(from, value)
    return reply(done)
  })

const dur = (s = '') => {
  const m = s.match(/^(\d+)([smh])$/i)
  return m ? Number(m[1]) * { s: 1e3, m: 6e4, h: 36e5 }[m[2].toLowerCase()] : 0
}

const timer = (name, value, label) =>
  groupCmd(name, { botAdmin: true }, async ({ sock, from, args, reply }) => {
    const ms = dur(args[0])
    if (!ms) return reply(`Usage : .${name} 10m (s = secondes, m = minutes, h = heures)`)
    setTimeout(() => sock.groupSettingUpdate(from, value).catch(() => {}), ms)
    return reply(`⏳ ${label} dans ${args[0]}. (annulé si le bot redémarre)`)
  })

export default [
  groupCmd('setgcname', { botAdmin: true }, async ({ sock, from, q, reply }) => {
    if (!q) return reply('Usage : .setgcname Nouveau nom')
    await sock.groupUpdateSubject(from, q)
    return reply('✅ Nom du groupe modifié.')
  }),

  groupCmd('groupdesc', { botAdmin: true }, async ({ sock, from, q, meta, reply }) => {
    if (!q) return reply(`📝 ${meta.desc || 'Aucune description'}\n\nUsage : .groupdesc nouvelle description`)
    await sock.groupUpdateDescription(from, q)
    return reply('✅ Description modifiée.')
  }),

  groupCmd('setgcpic', { botAdmin: true }, async ({ sock, msg, from, reply }) => {
    const buffer = await getImage(sock, msg, from)
    if (!buffer) return reply('📸 Réponds à une image avec *.setgcpic*')
    await sock.updateProfilePicture(from, buffer)
    return reply('✅ Photo du groupe modifiée.')
  }),

  groupCmd('link', { botAdmin: true }, async ({ sock, from, reply }) =>
    reply('🔗 https://chat.whatsapp.com/' + (await sock.groupInviteCode(from)))
  ),

  groupCmd('revokelink', { botAdmin: true }, async ({ sock, from, reply }) =>
    reply('♻️ Nouveau lien : https://chat.whatsapp.com/' + (await sock.groupRevokeInvite(from)))
  ),

  setting('lockinfo', 'locked', '🔒 Seuls les admins peuvent modifier les infos du groupe.'),
  setting('unlockinfo', 'unlocked', '🔓 Tous les membres peuvent modifier les infos du groupe.'),
  setting('mute', 'announcement', '🔇 Groupe fermé : seuls les admins peuvent écrire.'),
  setting('unmute', 'not_announcement', '🔊 Groupe ouvert : tout le monde peut écrire.'),

  groupCmd('gcstatus', {}, async ({ meta, reply }) =>
    reply(
      `📊 *${meta.subject}*\n\n` +
      `👥 Membres : ${meta.participants.length}\n` +
      `👑 Admins : ${meta.participants.filter((p) => p.admin).length}\n` +
      `💬 Messages : ${meta.announce ? 'admins seulement' : 'tout le monde'}\n` +
      `✏️ Infos : ${meta.restrict ? 'admins seulement' : 'tout le monde'}`
    )
  ),

  timer('opentime', 'not_announcement', 'Ouverture du groupe'),
  timer('closetime', 'announcement', 'Fermeture du groupe')
]
