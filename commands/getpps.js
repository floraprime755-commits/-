import { downloadMediaMessage, jidNormalizedUser } from '@whiskeysockets/baileys'
import pino from 'pino'

export default {
  name: 'getpps',
  owner: true,
  async run({ sock, msg, from, reply }) {
    const ctx = msg.message?.extendedTextMessage?.contextInfo
    let target = null

    if (msg.message?.imageMessage) {
      target = msg
    } else if (ctx?.quotedMessage?.imageMessage) {
      target = {
        key: { remoteJid: from, id: ctx.stanzaId, participant: ctx.participant },
        message: ctx.quotedMessage
      }
    }

    if (!target) {
      return reply('📸 Réponds à une image avec *.getpps* (ou envoie une image avec .getpps en légende).')
    }

    try {
      const buffer = await downloadMediaMessage(
        target,
        'buffer',
        {},
        { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage }
      )
      await sock.updateProfilePicture(jidNormalizedUser(sock.user.id), buffer)
      await reply('✅ Photo de profil mise à jour !')
    } catch (e) {
      console.log(e)
      await reply('❌ Échec : ' + e.message)
    }
  }
}
