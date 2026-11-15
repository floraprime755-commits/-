export default {
  name: 'getpp',
  owner: true,
  async run({ sock, msg, from, args, sender, reply }) {
    const ctx = msg.message?.extendedTextMessage?.contextInfo
    let target
    if (ctx?.mentionedJid?.length) target = ctx.mentionedJid[0]
    else if (ctx?.participant) target = ctx.participant
    else if (args[0]) target = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net'
    else target = from.endsWith('@g.us') ? sender : from

    try {
      const url = await sock.profilePictureUrl(target, 'image')
      await sock.sendMessage(
        from,
        { image: { url }, caption: '🖼️ Photo de profil récupérée' },
        { quoted: msg }
      )
    } catch {
      await reply('❌ Impossible de récupérer la photo (aucune photo ou profil privé).')
    }
  }
}
