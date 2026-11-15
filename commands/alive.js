export default {
  name: 'alive',
  owner: true,
  async run({ reply, config }) {
    const fmt = (d) =>
      d.toLocaleString('fr-FR', {
        timeZone: config.timezone,
        dateStyle: 'full',
        timeStyle: 'medium'
      })
    const up = Date.now() - config.deployedAt.getTime()
    const d = Math.floor(up / 86400000)
    const h = Math.floor((up % 86400000) / 3600000)
    const m = Math.floor((up % 3600000) / 60000)
    const s = Math.floor((up % 60000) / 1000)
    await reply(
      `✅ *${config.botName}* est en ligne !\n\n` +
      `🚀 Déployé le : ${fmt(config.deployedAt)}\n` +
      `⏱️ Actif depuis : ${d}j ${h}h ${m}min ${s}s`
    )
  }
}
