export default {
  name: 'ping',
  owner: true,
  async run({ sock, msg, from }) {
    const start = Date.now()
    const sent = await sock.sendMessage(from, { text: '🏓 Test de vitesse...' }, { quoted: msg })
    const ms = Date.now() - start
    await sock.sendMessage(from, {
      text: `🏓 *Pong !*\n⚡ Vitesse : *${ms} ms*`,
      edit: sent.key
    })
  }
}
