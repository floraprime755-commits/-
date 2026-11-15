import { loadCommands, handleMessage } from './handler.js'
await loadCommands()
const sock = {
  user: { id: '1:1@s.whatsapp.net' },
  sendMessage: async (jid, c) => {
    console.log('➡️ réponse :', JSON.stringify(c).slice(0, 120))
    return { key: { id: 'X', remoteJid: jid } }
  }
}
const msg = {
  key: { remoteJid: '1@s.whatsapp.net', fromMe: true, id: 'T1' },
  message: { conversation: '.menu' },
  messageTimestamp: Math.floor(Date.now() / 1000)
}
await handleMessage(sock, msg)
process.exit(0)
